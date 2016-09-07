var express = require('express'),
    djFileIO = require('../index'),
    formidable = require('formidable'),
    fs = require('fs'),
    app = express();

djFileIO.config.host = '10.0.0.100';
djFileIO.config.port = '27017';
djFileIO.config.database = 'djcloud';
djFileIO.config.type = 1;
djFileIO.config.path = "D:/upload";


/*djFileIO.getConnection(function(err, data){
    console.log(err);
});*/

app.get('/', function(req, res){
    res.sendfile(__dirname + '/view/index.html');
});

app.post('/upload', function(req, res){
    console.log('업로드 서버 호출');
    djFileIO.fileUpload(req, 'admin', '/', '', function(err, f){
        if(err){
            console.log(err);
        }else{
            res.redirect('/');
        }
    });
    /*var form = new formidable.IncomingForm();

    form.parse(req);
    form.on('fileBegin', function (name, file){

    });

    form.on('file', function (name, file){

    });*/
});

app.get('/list', function(req, res){
    djFileIO.fileList(req.query.code, function(err, list){
        djFileIO.properties(req.query.code, function(result){
            res.jsonp({
                list: list.data,
                prop: result
            });
        });

    });
});

app.get('/addFolder', function(req, res){
    //function(userNo, parentCode, name, callback){
    var parent = req.query.parent || '/';
    var name = req.query.name;
    djFileIO.addFolder('admin', parent, name, function(err, data){
        res.jsonp(data);
    })
});

app.get('/properties', function(req, res){
    var code = req.query.code;
    djFileIO.properties(code, function(result){
        res.jsonp(result);
    });
});

app.get('/delete', function(req, res){
    var code = req.query.code;
    djFileIO.fileDelete(code, function(result){
        res.jsonp(result);
    });
});

app.listen(3001);