/**
 * Created by 동진 on 2016-08-03.
 */
var con = require('./Connection'),
    fs = require('fs'),
    os = require('os'),
    djms = require('djms'),
    formidable = require('formidable'),
    exec = require('child_process').exec,
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

// 미디어 스트리밍
exports.mediaStreaming = function(req, res, code){
    con.getfile(code,function(err, data){
        if(err || !data){
            console.log('media streaming err');
        }else{
            djms.pipe(req, res, con.config.path+'/'+data._id+'.'+data.fileExt);
        }
    })
};

// 미디어 정보
exports.mediaTag = function(code, callback){
    con.getfile(code,function(err, data){
        if(err || !data){
            console.log('get media tag err');
        }else{
            djms.getTag(con.config.path+'/'+data._id+'.'+data.fileExt, function(err, tag){
                callback(err, tag);
            });
        }
    })
};

// 파일 업로드
exports.fileUpload = function(req, userNo, parentCode, folder, callback){
    var form = new formidable.IncomingForm();
    var id = app.createKey(), upfile, ext, fileName, folderId;

    form.parse(req);
    form.on('fileBegin', function (name, file){
        // 파일 아이디 생성
        ext = file.name.split('.')[file.name.split('.').length - 1];
        fileName = ext ? (id+'.'+ext) : id;
        // 서버에 파일 쓰기(업로드), 파일명 대신 파일 아이디로 저장
        file.path = con.config.path+'/'+fileName;
        upfile = file;
    });

    form.on('end', function (name, file){
        getFolderId(parentCode, folder, function(code){
            app.thumb(con.config.path+'/'+fileName, ext, con.config.path+'/thumb', function(){
                // db에 등록 fileUpload(id, userNo, fileName, fileExt,fileSize, fileMime, parent, callback);
                con.fileUpload(id, userNo, upfile.name, "1", ext, upfile.size, upfile.type, code, function(err, doc){
                    callback(err, doc);
                });
            });
        });
    });

    function getFolderId(parentCode, folder, callback){
        // 폴더 업로드시 폴더가 있는지 체크
        if(folder && folder !== ''){
            var folders = folder.split("/");
            cuf(0, parentCode, folders,function(folderId){
                callback(folderId);
            });
            function cuf(cnt, parentCode, folders, c){
                if(folders[cnt]){
                    con.uploadFolder(parentCode, folders[cnt], function(err, rtn){
                        if(!rtn.length){
                            folderId = app.createKey();
                            // db에 등록 fileUpload(id, userNo, fileName, fileExt,fileSize, fileMime, parent, callback);
                            con.fileUpload(folderId, userNo, folders[cnt], "2", null, null, "folder", parentCode, function(err, doc){
                                if(folders.length <= cnt+1) c(folderId);
                                else cuf(cnt+1, folderId, folders, c);
                            });
                        }
                        else{
                            if(folders.length <= cnt+1) c(rtn[0]._id);
                            else cuf(cnt+1, rtn[0]._id, folders, c);
                        }
                    });
                }else{
                    if(folders.length <= cnt+1) c(parentCode);
                    else cuf(cnt+1, parentCode, folders, c);
                }
            }
        }else{
            callback(parentCode);
        }
    }
};



// 폴더 생성
exports.addFolder = function(userNo, parentCode, name, callback){
    // db에 등록 fileUpload(id, userNo, fileName, fileExt,fileSize, fileMime, parent, callback);
    con.fileUpload(app.createKey(), userNo, name, "2", null, null, "folder", parentCode, function(err, doc){
        callback(err, doc)
    });
};

// 파일 정보
exports.properties = function(code, user, callback){
    var args = Array.prototype.slice.call(arguments);
    var a , b, c;
    args.forEach(function(v,i){
        if(typeof v === 'function') c = v;
        else{
            if(i === 0) a = v;
            else if(i === 1) b = v;
        }
    });
    try{
        con.getfile(a, b, function(err, data){
            if(err) c(err, null);
            else{
                if(!data) data = {parentCode: code};
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
                        c(rtn);
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
                con.getfile(parent, b, function(err, data){
                    if(err) callback("/");
                    else{
                        if(!data) callback(path);
                        else{
                            path = data.fileName+'/'+path;
                            getPath(data.parentCode, path, callback);
                        }
                    }
                });
            }
        }

        // 사이즈, 하위 파일 정보
        function getSub(file, callback){
            if(file.type === '1') callback(file.fileSize, null, null);
            else{
                getSub2(file._id || code, callback);
            }
            function getSub2(code,callback){
                con.fileList(code, b, function(err, list){
                    if(list && list.data.length > 0){
                        getSub3(0, list.data, 0, 0, 0,function(size, file, folder){
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
                    con.fileList(list[cnt]._id, b, function(err, list2){
                        if(list2 && list2.data.length > 0){
                            getSub3(0, list2.data, size, file, folder, function (size, file, folder) {
                                if (list.length <= cnt + 1) callback(size, file, folder);
                                else getSub3(cnt + 1, list, size, file, folder, callback);
                            });
                        }else callback(0,0,0);
                    })
                }
            }
        }
    }catch (e){
        c(null);
    }
};

// 파일 목록
exports.fileList = function(parent , option, callback){
    /*option = {
        user: "",
        sort: "",
        limit: "",
        page: ""
    }*/
    var args = Array.prototype.slice.call(arguments);
    var a , b, c;
    args.forEach(function(v,i){
        if(typeof v === 'function') c = v;
        else{
            if(i === 0) a = v;
            else if(i === 1) b = v;
        }
    });
    con.fileList(a, b, function(err, data){
        app.getImageSrc(data.data, function(d){
            c(err, {data:d, info:data.info});
        })
    });
};

// 이미지 src 가져오기
exports.getImageSrc = function(data, callback){
    var rtnArray = [];
    data.forEach(function(v,i){
        if(app.getType(v.fileExt)){
            fs.readFile(con.config.path+'/thumb/'+v._id+'.jpg', function(err, f){
                if(err) rtnArray.push(v);
                else{
                    v.src = "data:image/jpeg;base64,"+new Buffer(f, 'binary').toString('base64');
                    rtnArray.push(v);
                }
            })
        }else if(v.fileExt === 'mp3'){
            djms.getTag(con.config.path+'/'+v._id+"."+v.fileExt, function(err, tag){
                v.src = tag.picture;
                rtnArray.push(v);
            });
        }else{
            rtnArray.push(v);
        }
    });

    var inter = setInterval(function(){
        if(data.length <= rtnArray.length) {
            clearInterval(inter);
            callback(rtnArray);
        }
    },300);
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
                                        fs.exists(con.config.path+'/thumb/'+data._id+'.jpg', function(exists){
                                            if(exists){
                                                fs.unlink(con.config.path+'/thumb/'+data._id+'.jpg', function(err){
                                                    callback(err, 1);
                                                })
                                            }else {
                                                callback(err, 1);
                                            }
                                        });
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
                        con.fileUpload(nId, data.userNo, data.fileName, data.type, data.fileExt, data.fileSize, data.fileMime, parent, function(err, doc){
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

// 썸네일 만들기
exports.thumb = function(path, ext, destPath, callback){
    var rtnPath = destPath+"/"+path.split("/")[path.split("/").length - 1].split(".")[0]+".jpg";
    fs.exists(con.config.path+'/thumb', function(exists){
        if(!exists){
            fs.mkdir(con.config.path+'/thumb', function(){
                callback(makeThumb());
            })
        }else{
            callback(makeThumb());
        }
    });

    function makeThumb(){
        switch (app.getType(ext)) {
            case "video":
                var seek = "00:00:05";
                var command = "ffmpeg -i \"" + path + "\" -ss \"" + seek + "\" -vframes 1 -f image2 \"" + rtnPath + "\"";
                return exec(command, function(err){
                    var command2 = '';
                    os.type().indexOf("Window") > -1 ? command2 = 'magick' : command2 = 'convert';
                    command2 += " "+rtnPath+" -resize 200x200 "+rtnPath;
                    return exec(command2);
                });

            case "image":
                var command = '';
                os.type().indexOf("Window") > -1 ? command = 'magick' : command = 'convert';
                command += " "+path+" -resize 200x200 "+rtnPath;
                return exec(command);

            default:
                return true;
        }
    }
};

// 이미지 로드하기
exports.imageLoad = function(code, res){
    con.getfile(code, function(err, data){
        if(err) res.writeHead(500, err);
        else{
            if(app.getType(data.fileExt) === 'image'){
                var img = fs.readFileSync(con.config.path+'/'+data._id+'.'+data.fileExt);
                res.writeHead(200, {'Content-Type': 'image/'+data.fileExt});
                res.end(img, 'binary');
            }else{
                res.writeHead(500, {'message': 'not image file'});
            }
        }
    });
};

exports.getType = function (ext){
    switch (ext.toLowerCase()) {
        case "mp4":
        case "3gp":
        case "mov":
        case "avi":
            return "video";

        case "jpeg":
        case "jpg":
        case "png":
        case "gif":
        case "tiff":
            return "image";

        default:
            return null;
    }
}