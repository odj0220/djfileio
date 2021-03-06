/**
 * Created by 동진 on 2016-08-03.
 */
var ObjectID = require('../node_modules/mongodb').ObjectID,
    mongo = require('../node_modules/mongodb'),
    app = this;

exports.config = {
    type: null,     // db 종류 { 1: mongodb, 2: mysql}
    host: null,     // 연결 주소
    port: null,     // 연결 포트
    database: null,   // db 이름
    user: null,     // 아이디
    password: null,     // 비밀번호
    filePath: null,//파일 경로
}

// 커넥션 함수로, res를 변수로 넘기지 않으면 커넥션 정보를 리턴한다.
exports.getConnection = function(callback){
    if(!app.config.host || !app.config.port || !app.config.database) callback(new Error('database 연결정보를 확인하세요.'), null);
    // 몽고디비일때
    if(app.config.type === 1){
        var url = 'mongodb://'+app.config.host+':'+app.config.port+'/'+app.config.database;

        mongo.connect(url, function(err, db) {
            if(err){
                console.log(err)
            }else{
                callback(err, db);
            }
        })
    }
};

// 파일정보 db 업로드
exports.fileUpload = function(id, userNo, fileName, type, fileExt,fileSize, fileMime, parent, callback){
    parent = parent || '/';
    // db 커넥션
    app.getConnection(function(err, db){
        if(err){
            callback(err, null);
        }else{
            // mongodb
            if(app.config.type === 1){
                db.collection('djFiles').insert({
                    _id: id,
                    userNo: userNo,
                    fileName: fileName,
                    fileExt: fileExt,
                    fileSize: fileSize,
                    fileMime: fileMime,
                    parentCode: parent,
                    type: type,
                    created: new Date()
                }, function(err, doc){
                    callback(err, doc);
                    db.close();
                })
            }
            // mysql
            else if(this.config.type === 2){

            }
        }
    });
};

// 업로드 폴더 조회
exports.uploadFolder = function(parentId, name, callback){
    // db 커넥션
    app.getConnection(function(err, db){
        if(err){
            callback(err, null);
        }else{
            // mongodb
            if(app.config.type === 1){
                db.collection('djFiles').find({"parentCode": parentId, 'fileName': name}).toArray(function(err, docs){
                    callback(err,docs);
                    db.close();
                })
            }
            // mysql
            else if(this.config.type === 2){

            }
        }
    });
};

// 파일 목록 조회
exports.fileList = function(parent, option, callback){
    var args = Array.prototype.slice.call(arguments);
    var a , b, c, query;
    args.forEach(function(v,i){
        if(typeof v === 'function') c = v;
        else{
            if(i === 0) a = v;
            else if(i === 1) b = v;
        }
    });
    // 기본 경로가 없으면 루트("/")
    a = a || "/";

    // 기본 검색옵션 설정
    var _option = {
        user: null,
        sort: "created",
        limit: 0,
        page: 0
    };
    for(var key in _option){
        if(b && b[key]) _option[key] = b[key];
    }

    // db 커넥션
    app.getConnection(function(err, db){
        if(err){
            c(err, null);
        }else{
            // mongodb
            if(app.config.type === 1){
                _option["skip"] = ((+_option.page * (+_option.limit)) - (+_option.limit)) < 0 ? 0 : ((+_option.page *(+_option.limit)) - (+_option.limit));
                if(_option.user) query = {"parentCode": a, "userNo": _option.user};
                else query = {"parentCode": a};
                var sort= {};
                sort[_option["sort"]] = -1;
                db.collection('djFiles').count(query, function(err, count){
                    db.collection('djFiles').find(query).sort(sort).skip(+_option.skip).limit(+_option.limit).toArray(function(err, docs){
                        c(err,{
                            data: docs,
                            info:{
                                totalCnt: count,
                                totalPage: +_option.limit > 0 ? Math.floor((count-1)/(+_option.limit))+1 : 0,
                                page: +_option.limit && +_option.page < 1? 1 : +_option.page,
                                limit: +_option.limit
                            }
                        });
                        db.close();
                    });
                });
            }
            // mysql
            else if(this.config.type === 2){

            }
        }
    });
};

// 파일 조회
exports.getfile = function(code, userNo, callback){
    var args = Array.prototype.slice.call(arguments);
    var a , b, c, query;
    args.forEach(function(v,i){
        if(typeof v === 'function') c = v;
        else{
            if(i === 0) a = v;
            else if(i === 1) b = v;
        }
    });

    app.getConnection(function(err, db){
        if(err){
            c(err, null);
        }else{
            // mongodb
            if(app.config.type === 1){
                if(b) query = {"_id": a, "userNo": b};
                else query = {"_id": a};
                db.collection('djFiles').findOne(query, function(err, data){
                    c(err, data);
                    db.close();
                });
            }
            // mysql
            else if(this.config.type === 2){

            }
        }
    });
};

// 파일 삭제
exports.removeFile = function(code, callback){
    app.getConnection(function(err, db){
        if(err){
            callback(err, null);
        }else{
            // mongodb
            if(app.config.type === 1){
                db.collection('djFiles').remove({'_id': code}, function(err, data){
                    callback(err, data);
                    db.close();
                });
            }
            // mysql
            else if(this.config.type === 2){

            }
        }
    });
};

// 파일 이동
exports.moveFile = function(code, parent, callback){
    app.getConnection(function(err, db){
        if(err){
            callback(err, null);
        }else{
            // mongodb
            if(app.config.type === 1){
                db.collection('djFiles').update({'_id': code}, {$set:{parentCode: parent}}, function(err, data){
                    callback(err, data);
                    db.close();
                });
            }
            // mysql
            else if(this.config.type === 2){

            }
        }
    });
};

// 파일 이름 변경
exports.rename = function(code, rename, callback){
    app.getConnection(function(err, db){
        if(err){
            callback(err, null);
        }else{
            // mongodb
            if(app.config.type === 1){
                db.collection('djFiles').update({'_id': code}, {$set:{fileName: rename}}, function(err, data){
                    callback(err, data);
                    db.close();
                });
            }
            // mysql
            else if(this.config.type === 2){

            }
        }
    });
};