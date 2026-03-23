let multer = require('multer')
let path = require('path')
let fs = require('fs')

// Tu dong tao thu muc 'uploads/' neu chua co de tranh loi
if (!fs.existsSync('uploads/')) {
    fs.mkdirSync('uploads/');
}

// Cấu hình lưu trữ
let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname)
        // Tao ten file duy nhat de khong bi ghi de
        let fileName = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
        cb(null, fileName)
    }
})

// Bo loc cho hinh anh
let filterImage = function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true)
    } else {
        cb(new Error("File khong phai la hinh anh!"), false)
    }
}

// QUAN TRONG: Sua bo loc Excel de ho tro ca file CSV cua ban
let filterExcel = function (req, file, cb) {
    const allowedMimeTypes = [
        "text/csv", 
        "application/vnd.ms-excel", 
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
        cb(null, true)
    } else {
        cb(new Error("Dinh dang file phai la CSV hoac Excel!"), false)
    }
}

module.exports = {
    uploadImage: multer({
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // Gioi han 5MB
        fileFilter: filterImage
    }),
    uploadExcel: multer({
        storage: storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // Tang len 10MB cho file danh sach lon
        fileFilter: filterExcel
    })
}