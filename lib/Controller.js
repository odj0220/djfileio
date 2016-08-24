/**
 * Created by 동진 on 2016-08-03.
 */
var con = require('./Connection'),
    fs = require('fs'),
    app = this;

// 파일 키 생성
exports.createKey = function (len) {
    len = len || 20;
    var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
};

// 파일 업로드
exports.fileUpload = function(userNo, parentCode, file, callback){
    // 파일 아이디 생성
    var id = app.createKey();
    var ext = file.name.split('.')[file.name.split('.').length - 1];
    var fileName = ext ? (id+'.'+ext) : id;
    // 서버에 파일 쓰기(업로드), 파일명 대신 파일 아이디로 저장
    var writeStream = fs.createWriteStream(file.path);
    fs.writeFile(con.config.path+'/'+fileName, writeStream, function(err,d){
        if(err){

        }else{
            // db에 등록 fileUpload(id, userNo, fileName, fileExt,fileSize, fileMime, parent, callback);
            con.fileUpload(id, userNo, file.name, "1", ext, file.size, file.type, parentCode, function(err, doc){
                callback(err, doc);
            });
        }
        writeStream.end();
    });
};

// 폴더 생성
exports.addFolder = function(userNo, parentCode, name, callback){
    // db에 등록 fileUpload(id, userNo, fileName, fileExt,fileSize, fileMime, parent, callback);
    con.fileUpload(app.createKey(), userNo, name, "2", null, null, "folder", parentCode, function(err, doc){
        callback(err, doc)
    });
};

// 파일 정보
exports.properties = function(code, callback){
    try{
        con.getfile(code, function(err, data){
            if(err || !data) callback(err, null);
            else{
                // 경로구하기
                getPath(data, '', function(path){
                    // 사이즈, 하위 정보
                    getSub(data, function(size, file, folder){
                        var rtn = {
                            name: data.fileName,
                            mime: data.fileMime,
                            path: path,
                            size: size,
                            sub: {
                                folder: folder,
                                file: file
                            },
                            code: data._id,
                            parent: data.parentCode,
                            created: data.created
                        };
                        callback(rtn);
                    });
                })
            }
        });

        // 전체 경로
        function getPath(file, path, callback){
            var parent = file.parentCode || '/';
            if(parent === '/') {
                path = '/'+path;
                callback(path);
            }else if(parent === 'recycle'){
                path = 'recycle'+path;
                callback(path);
            }else{
                con.getfile(parent, function(err, data){
                    if(err) callback("/");
                    else{
                        path = data.fileName+'/'+path;
                        getPath(data.parentCode, path, callback);
                    }
                });
            }
        }

        // 사이즈, 하위 파일 정보
        function getSub(file, callback){
            if(file.type === '1') callback(file.fileSize, null, null);
            else{
                getSub2(file._id, callback);
            }
            function getSub2(code,callback){
                con.fileList(code, function(err, list){
                    if(list && list.length > 0){
                        getSub3(0, list, 0, 0, 0,function(size, file, folder){
                            callback(size, file, folder);
                        });
                    }else callback(0,0,0);
                })
            }
            function getSub3(cnt, list, size, file, folder, callback){
                if(list[cnt].type === '1'){
                    size = size+list[cnt].fileSize;
                    file = file+1;
                    if(list.length <= cnt+1) callback(size,file,folder);
                    else getSub3(cnt+1, list, size, file, folder, callback);
                }else{
                    folder = folder+1;
                    con.fileList(list[cnt]._id, function(err, list2){
                        if(list2 && list2.length > 0){
                            getSub3(0, list2, size, file, folder, function (size, file, folder) {
                                if (list.length <= cnt + 1) callback(size, file, folder);
                                else getSub3(cnt + 1, list, size, file, folder, callback);
                            });
                        }else callback(0,0,0);
                    })
                }
            }
        }
    }catch (e){
        callback(null);
    }
};

// 파일 목록
exports.fileList = function(parent ,callback){
    con.fileList(parent, function(err, data){
        callback(err, data);
    });
};

// 파일삭제
exports.fileDelete = function(code, callback){
    con.getfile(code, function(err, data){
        if(err || !data) callback(err, null);
        else{
            // 경로가 휴지통이면 완전삭제 아니면 휴지통으로 이동
            if(data.parentCode === 'recycle'){
                if(data.type === '1'){
                    con.removeFile(code, function(err, doc){
                        if(err)callback(err, null);
                        else{
                            var file = data._id+'.'+data.fileExt;
                            fs.exists(con.config.path+'/'+file, function(exists){
                                if(exists){
                                    fs.unlink(con.config.path+'/'+file, function(err){
                                        console.log('file remove');
                                        callback(err, 1);
                                    })
                                }
                            });
                        }
                    });
                }else {
                    getSub2(code, function(err, len){
                        callback(err, len);
                    });
                }
                function getSub2(code,callback){
                    con.removeFile(code, function(err, doc){
                        if(err)callback(err, null);
                        else{
                            con.fileList(code, function(err, list){
                                if(list && list.length > 0){
                                    getSub3(0, list, 1, function(err, len){
                                        callback(err, len);
                                    });
                                }else callback(null, 0);
                            })
                        }
                    });
                }
                function getSub3(cnt, list, len, callback){
                    var f = list[cnt];
                    len = len+1;
                    if(f.type === '1'){
                        con.removeFile(f._id, function(err, doc){
                            if(err)callback(err, null);
                            else{
                                var file = f._id+'.'+f.fileExt;
                                fs.exists(con.config.path+'/'+file, function(exists){
                                    if(exists){
                                        fs.unlink(con.config.path+'/'+file, function(err){
                                            if(list.length <= cnt+1) callback(null, len);
                                            else getSub3(cnt+1, list, len, callback);
                                        })
                                    }
                                });
                            }
                        });
                    }else{
                        con.removeFile(f._id, function(err, doc){
                            if(err)callback(err, null);
                            else{
                                con.fileList(f._id, function(err, list2){
                                    if(list2 && list2.length > 0){
                                        getSub3(0, list2, len, function (err, len) {
                                            if (list.length <= cnt + 1) callback(null, len);
                                            else getSub3(cnt + 1, list, len, callback);
                                        });
                                    }else callback(null, len);
                                })
                            }
                        });
                    }
                }
            }else{
                con.moveFile(code, 'recycle', function(err, doc){
                    callback(err, {message: 'Move files to the Recycle Bin'});
                });
            }
        }
    });
};

// 파일 이동
exports.moveFile = con.moveFile;

// 파일 복사
exports.copyFile = function(code, parent, callback){
    con.getfile(code, function(err, data){
        if(err || !data) callback(err, null);
        else{
            if(data.type === '1'){
                var nId = app.createKey();
                var file = con.config.path+'/'+data._id+'.'+data.fileExt;
                var nFile = con.config.path+'/'+nId+'.'+data.fileExt;

                // 실제 파일 복사
                fs.createReadStream(file).pipe(fs.createWriteStream(nFile));
                // 파일존재여부 확인 후 db 업데이트
                fs.exists(nFile, function(exists){
                    if(exists){
                        con.fileUpload(nId, data.userNo, data.fileName, f.type, data.fileExt, data.fileSize, data.fileMime, parent, function(err, doc){
                            callback(err, doc);
                        });
                    }
                });
            }else {
                getSub2(data, parent, function(err, len){
                    callback(err, {message: 'file copy success', length: len});
                });
            }

            function getSub2(data, parent, callback){
                // 새로운 id로 같은 폴더를 db에 생성
                var nId = app.createKey();
                var file = con.config.path+'/'+data._id+'.'+data.fileExt;
                var nFile = con.config.path+'/'+nId+'.'+data.fileExt;

                // db에 등록 fileUpload(id, userNo, fileName, type, fileExt,fileSize, fileMime, parent, callback);
                con.fileUpload(nId, data.userNo, data.fileName, data.type, data.fileExt, data.fileSize, data.fileMime, parent, function(err, doc){
                    if(err) callback(err, doc);
                    else{
                        con.fileList(data._id, function(err, list){
                            if(list && list.length > 0){
                                getSub3(0, list, nId, 1, function(err, len){
                                    callback(err, len);
                                });
                            }else callback(null, 0);
                        })
                    }
                });
            }

            function getSub3(cnt, list, parent, len, callback){
                var f = list[cnt];
                var nId = app.createKey();
                len = len+1;
                if(f.type === '1'){
                    var file = con.config.path+'/'+f._id+'.'+f.fileExt;
                    var nFile = con.config.path+'/'+nId+'.'+f.fileExt;

                    // 실제 파일 복사
                    fs.createReadStream(file).pipe(fs.createWriteStream(nFile));
                    // 파일존재여부 확인 후 db 업데이트
                    fs.exists(nFile, function(exists){
                        if(exists){
                            con.fileUpload(nId, f.userNo, f.fileName, f.type, f.fileExt, f.fileSize, f.fileMime, parent, function(err, doc){
                                if (list.length <= cnt + 1) callback(null, len);
                                else getSub3(cnt + 1, list, parent, len, callback);
                            });
                        }
                    });
                }else{
                    con.fileUpload(nId, f.userNo, f.fileName, f.type, f.fileExt, f.fileSize, f.fileMime, parent, function(err, doc) {
                        if (err) callback(err, doc);
                        else {
                            con.fileList(f._id, function (err, list2) {
                                if (list2 && list2.length > 0) {
                                    getSub3(0, list2, nId, len, function (err, len) {
                                        if (list.length <= cnt + 1) callback(null, len);
                                        else getSub3(cnt + 1, list, parent, len, callback);
                                    });
                                } else callback(null, len);
                            });
                        }
                    });
                }
            }
        }
    });
};