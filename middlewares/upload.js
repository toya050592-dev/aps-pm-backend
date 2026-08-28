const multer = require('multer');
const crypto = require('crypto');
const FileType = require('file-type');
const fs = require('fs');
const util = require('util');
const path = require('path');
const unlinkAsync = util.promisify(fs.unlink);

const safeFileFilter = (req, file, cb) => { 
    if(file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf' || file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel')) { 
        cb(null, true); 
    } else { 
        const err = new Error('Format dilarang! Hanya Gambar, PDF, Excel.'); 
        err.isMulterFilter = true; 
        cb(err); 
    } 
};

const upload = multer({ storage: multer.memoryStorage(), fileFilter: safeFileFilter, limits: { fileSize: 15*1024*1024 } });

const validateMagicBytes = async (req, res, next) => {
  if (!req.file && (!req.files || Object.keys(req.files).length === 0)) {
    return next();
  }

  const checkFile = async (file) => {
    let type;
    if (file.buffer) {
      type = await FileType.fromBuffer(file.buffer);
    } else if (file.path) {
      type = await FileType.fromFile(file.path);
    }
    
    const allowedMimeTypes = [
      'application/pdf', 
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
      'application/vnd.ms-excel', 
      'application/x-msdownload', 
      'application/zip' 
    ];

    if (!type || !allowedMimeTypes.includes(type.mime)) {
      throw new Error('Validasi Magic Bytes Gagal: Tipe file sebenarnya tidak sesuai (' + (type ? type.mime : 'unknown') + ').');
    }
  };

  const getFiles = () => {
    let files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
      if (Array.isArray(req.files)) {
        files = files.concat(req.files);
      } else {
        for (const key in req.files) {
          files = files.concat(req.files[key]);
        }
      }
    }
    return files;
  };

  const allFiles = getFiles();

  try {
    for (const file of allFiles) {
      await checkFile(file);
    }
    next();
  } catch (err) {
    try {
      for (const file of allFiles) {
        if (file.path) await unlinkAsync(file.path);
      }
    } catch (unlinkErr) {
      console.error('Failed to clean up invalid file:', unlinkErr);
    }
    return res.status(400).json({ message: err.message });
  }
};

// Ensure directories exist
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
if (!fs.existsSync('./uploads/bast')) {
    fs.mkdirSync('./uploads/bast');
}
if (!fs.existsSync('./uploads/overtime')) {
    fs.mkdirSync('./uploads/overtime');
}
if (!fs.existsSync('./uploads/doc-tracking')) {
    fs.mkdirSync('./uploads/doc-tracking');
}

const overtimeStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/overtime/')
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, crypto.randomUUID() + (ext || '.pdf'));
    }
});
const uploadDisk = multer({ storage: overtimeStorage, fileFilter: safeFileFilter, limits: { fileSize: 15*1024*1024 } });

const bastStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/bast/')
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, crypto.randomUUID() + (ext || '.pdf'));
    }
});
const uploadBast = multer({ storage: bastStorage, fileFilter: safeFileFilter, limits: { fileSize: 15*1024*1024 } });

const docTrackingStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/doc-tracking/')
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, crypto.randomUUID() + (ext || '.pdf'));
    }
});
const uploadDoc = multer({ storage: docTrackingStorage, fileFilter: safeFileFilter, limits: { fileSize: 15*1024*1024 } });

const docFields = [
    { name: 'file_pm', maxCount: 1 },
    { name: 'file_pr', maxCount: 1 },
    { name: 'file_po', maxCount: 1 },
    { name: 'file_implementasi', maxCount: 1 },
    { name: 'file_bast', maxCount: 1 }
];

module.exports = { 
    upload, 
    uploadDisk, 
    uploadBast, 
    uploadDoc, 
    docFields,
    validateMagicBytes 
};
