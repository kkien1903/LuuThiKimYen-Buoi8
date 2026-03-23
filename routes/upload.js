var express = require("express");
var router = express.Router();
let { uploadImage, uploadExcel } = require('../utils/uploadHandler')
let path = require('path')
let excelJS = require('exceljs')
let fs = require('fs');
let productModel = require('../schemas/products')
let InventoryModel = require('../schemas/inventories')
let mongoose = require('mongoose')
let slugify = require('slugify')
let crypto = require('crypto')
let userController = require('../controllers/users')
let mailHandler = require('../utils/sendMailHandler')

router.post('/single', uploadImage.single('file'), function (req, res, next) {
    if (!req.file) {
        res.status(404).send({
            message: "file upload rong"
        })
    } else {
        res.send(req.file.path)
    }
})
router.post('/multiple', uploadImage.array('files'), function (req, res, next) {
    if (!req.files) {
        res.status(404).send({
            message: "file upload rong"
        })
    } else {
        let data = req.body;
        console.log(data);
        let result = req.files.map(f => {
            return {
                filename: f.filename,
                path: f.path,
                size: f.size
            }
        })
        res.send(result)
    }
})
router.get('/:filename', function (req, res, next) {
    let fileName = req.params.filename;
    let pathFile = path.join(__dirname, '../uploads', fileName)
    res.sendFile(pathFile)

})

router.post('/excel', uploadExcel.single('file'), async function (req, res, next) {
    if (!req.file) {
        res.status(404).send({
            message: "file upload rong"
        })
    } else {
        //workbook->worksheet-row/column->cell
        let pathFile = path.join(__dirname, '../uploads', req.file.filename)
        let workbook = new excelJS.Workbook();
        await workbook.xlsx.readFile(pathFile);
        let worksheet = workbook.worksheets[0];
        let products = await productModel.find({});
        let getTitle = products.map(p => p.title)
        let getSku = products.map(p => p.sku)
        let result = [];
        let errors = [];
        for (let index = 2; index <= worksheet.rowCount; index++) {
            let errorRow = [];
            const row = worksheet.getRow(index)
            let sku = row.getCell(1).value;//unique
            let title = row.getCell(2).value;
            let category = row.getCell(3).value;
            let price = Number.parseInt(row.getCell(4).value);
            let stock = Number.parseInt(row.getCell(5).value);
            //validate
            if (price < 0 || isNaN(price)) {
                errorRow.push("dinh dang price chua dung " + price)
            }
            if (stock < 0 || isNaN(stock)) {
                errorRow.push("dinh dang stock chua dung " + stock)
            }
            if (getTitle.includes(title)) {
                errorRow.push("title da ton tai")
            }
            if (getSku.includes(sku)) {
                errorRow.push("sku da ton tai")
            }
            if (errorRow.length > 0) {
                result.push({ success: false, data: errorRow })
                continue;
            } else {
                let session = await mongoose.startSession()
                session.startTransaction()
                try {
                    let newObj = new productModel({
                        sku: sku,
                        title: title,
                        slug: slugify(title, {
                            replacement: '-', remove: undefined,
                            locale: 'vi',
                            trim: true
                        }), price: price,
                        description: title,
                        category: category
                    })
                    let newProduct = await newObj.save({ session });
                    let newInv = new InventoryModel({
                        product: newProduct._id,
                        stock: stock
                    })
                    newInv = await newInv.save({ session })
                    await newInv.populate('product')
                    await session.commitTransaction();
                    await session.endSession()
                    getSku.push(sku);
                    getTitle.push(title)
                    result.push({ success: true, data: newInv });
                } catch (error) {
                    await session.abortTransaction();
                    await session.endSession()
                    errorRow.push(error.message)
                    result.push({ success: false, data: errorRow })
                }
            }
        }
        result = result.map(function (e, index) {
            if (e.success) {
                return (index + 1) + ": " + e.data.product.title
            } else {
                return (index + 1) + ": " + e.data
            }
        })
        res.send(result)
        fs.unlinkSync(pathFile);

    }
})

router.post('/users-excel', uploadExcel.single('file'), async function (req, res, next) {
    if (!req.file) {
        return res.status(404).send({ message: "file upload rong" })
    } else {
        let pathFile = path.join(__dirname, '../uploads', req.file.filename)
        let workbook = new excelJS.Workbook();
        
        try {
            // Kiểm tra định dạng file để đọc cho đúng
            if (req.file.originalname.endsWith('.csv')) {
                await workbook.csv.readFile(pathFile);
            } else {
                await workbook.xlsx.readFile(pathFile);
            }

            let worksheet = workbook.worksheets[0];
            let result = [];
            
            console.log("==> Tong so dong trong file:", worksheet.rowCount);

            for (let index = 2; index <= worksheet.rowCount; index++) {
                const row = worksheet.getRow(index);
                let username = row.getCell(1).value;
                let email = row.getCell(2).value;

                // Xử lý nếu dữ liệu là object
                if (email && typeof email === 'object') email = email.text || email.result;
                if (username && typeof username === 'object') username = username.text || username.result;

                if (!username || !email) continue;

                console.log(`Dang xu ly dong ${index}: ${username} - ${email}`);

                let password = crypto.randomBytes(8).toString('hex');
                
                try {
                    // BỎ TRANSACTION: Gọi trực tiếp hàm tạo user
                    await userController.CreateAnUser(
                        username,
                        password,
                        email,
                        "69a5462f086d74c9e772b804" // Role ID mặc định
                    );

                    // Gửi mail - Bây giờ lệnh này sẽ được thực hiện vì không còn lỗi Transaction
                    console.log(`   + Dang gui mail cho: ${email}...`);
                    await mailHandler.sendPasswordMail(email, username, password);
                    
                    result.push({ success: true, username: username, email: email });
                } catch (error) {
                    let errorMessage = error.message;
                    // Bắt lỗi 11000 của MongoDB (Duplicate Key)
                    if (error.code === 11000) {
                        errorMessage = "Username hoặc Email đã tồn tại trong hệ thống";
                    }
                    
                    console.error(`   - Loi tai dong ${index}:`, errorMessage);
                    result.push({ success: false, error: errorMessage, username: username });
                }
            }

            res.send(result);
            fs.unlinkSync(pathFile); 
        } catch (err) {
            console.error("Loi he thong:", err.message);
            res.status(500).send({ message: err.message });
        }
    }
})
module.exports = router;