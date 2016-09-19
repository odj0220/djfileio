var con = require('./lib/Connection');
var ctrl = require('./lib/Controller');
var app = this;

exports.config = {
    type: null,     // db 종류
    host: null,     // 연결 주소
    port: null,     // 연결 포트
    user: null,     // 아이디
    password: null,     // 비밀번호
    database: 'djcloud',
    filePath: null  //파일 경로
};
con.config = app.config;

exports.fileUpload = ctrl.fileUpload;
exports.fileList = ctrl.fileList;
exports.addFolder = ctrl.addFolder;
exports.properties = ctrl.properties;
exports.fileDelete = ctrl.fileDelete;
exports.moveFile = ctrl.moveFile;
exports.copyFile = ctrl.copyFile;
exports.rename = con.rename;
exports.mediaStreaming = ctrl.mediaStreaming;
exports.mediaTag = ctrl.mediaTag;
exports.imageLoad = ctrl.imageLoad;
