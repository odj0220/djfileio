# DJ File IO

DB 정보와 업로드 경로를 설정하면 DB 업데이트와 file IO등 기본적인 파일 관리를 담당 합니다.
업로드, 복사, 이동, 삭제, 이름바꾸기 등의 기능을 이용하실 수 있습니다.

## Installation

```
npm install djfileio --save
```

## How to Set Up

DB 종류, 접속정보, 업로드경로 등을 설정합니다.

```js
var djFileIO = require('djfileio');
djFileIO.config.type = 1; //1:mongodb, 2:mysql
djFileIO.config.host = '10.0.0.100'; //db host
djFileIO.config.port = '27017'; //db port
djFileIO.config.database = 'djcloud'; //database name
djFileIO.config.path = "D:/upload"; //upload path
```

### fileUpload

request 정보, user id, 상위 경로, 폴더정보(폴더 업로드시) 정보를 입력하면 db와 업로드 경로에 자동으로 파일을 업데이트, 업로드 합니다.

```js
var parentCode = req.query.parentCode; // null일대 제일 상위 경로("/")로 업로드
var folder = req.query.folder; // 폴더 업로드시
djFileIO.fileUpload(req, req.user._id, fileCode, folder, function(err, f){
    if(err){
      console.log(err);
    }else{
      res.redirect('/');
    }
});
```

### fileList

상위경로 코드, 옵션(user id, 표시 건수, 페이지) 정보를 이용하여 파일 및 폴더 리스트를 리턴 합니다.

```js
var parentCode = req.query.parentCode,
    limit = req.query.limit || 0,
    page = req.query.page || 1;
djFileIO.fileList(parentCode, {user: req.user._id, limit: limit, page: page}, function(err, list){
    res.jsonp(list);
});
```

### addFolder

'user id', '폴더 생성경로', '생성 폴더 이름'을 입력하여 새로운 폴더를 생성합니다.

```js
var user =  req.user._id,
    parentCode = req.body.code,
    folderName = req.body.name;
djFileIO.addFolder(user, parentCode, folderName, function(err, data){
    res.jsonp(data);
})
```

### properties

폴더 또는 파일 코드를 이용하여 파일 정보를 리턴합니다. 폴더의 경우 하위 폴더 밑 파일 정보까지 리턴합니다.
user 정보를 입력시 파일 또는 폴더의 소유자 정보와 일치하는지 확인 후 반환하며 미 입력시 일치 유무와 상관없이 정보를 리턴합니다.

```js
var code = req.body.cloudId,
    user = req.user._id;
djFileIO.properties(code, user, function(result){
    res.jsonp(result);
});
```

### fileDelete

폴더 또는 파일 코드를 이용하여 파일 및 정보를 삭제합니다. 파일 또는 폴더의 경로가 휴지통이 아닐경우 휴지통으로 이동하며,
경로가 휴지통일 경우 영구 삭제 합니다.

```js
djFileIO.fileDelete(req.cloud, function(result){
    res.jsonp(result);
});
```

### moveFile

폴더 또는 파일 코드, 이동할 경로 코드를 이용하여 파일 또는 폴더를 원하는 경로로 이동할 수 있습니다.

```js
var code = req.body.cloudId,
    movePath = req.body.movePath
djFileIO.moveFile(code, movePath, function(err, data){
    res.json(data)
});
```

### copyFile

폴더 또는 파일 코드, 복사할 경로 코드를 이용하여 파일 또는 폴더를 원하는 경로로 복사할 수 있습니다.

```js
var code = req.body.cloudId,
    copyPath = req.body.copyPath
djFileIO.copyFile(code, copyPath, function(err, data){
    res.json(data)
});
```

### rename

폴더 또는 파일 코드, 변경할 이름을 이용하여 파일 또는 폴더를 이름을 변경할 수 있습니다..

```js
var code = req.body.cloudId,
    name = req.body.name
djFileIO.rename(code, name, function(err, data){
    res.jsonp(data);
});
```

### imageLoad

이미지 파일 코드, response 정보를 입력하여 이미지 파일을 response 해줍니다.

```js
var code = req.body.cloudId;

djFileIO.imageLoad(code, response);
```

### mediaStreaming

djms 모듈의 streaming 기능을 이용하여 구동합니다. request, response, video 또는 audio 파일코드 정보를 이용하여 media 파일을 재생 가능한 형태로 response 합니다.

```js
var code = req.body.code;
djFileIO.mediaStreaming(req, res, code);

```

### mediaStreaming

djms 모듈의 getTag 기능을 이용하여 구동합니다. audio 파일코드 정보를 이용하여 audio 파일의 태그 정보를 리턴 합니다.

```js
var code = req.body.code;
djFileIO.mediaTag(code, function(err, data){
    res.jsonp(data);
});
```