var express         = require('express');
var cors            = require('cors');
var path            = require('path');
var favicon         = require('serve-favicon');
var morgan          = require('morgan');
var bodyParser      = require('body-parser');
var methodOverride  = require('method-override');
var log             = require('./libs/log')(module);
var config          = require('./libs/config');
var MissionModel    = require('./libs/mongoose').MissionModel;
var sha1            = require('js-sha1');
var axios           = require('axios');

var app = express();

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('tiny'));
app.use(bodyParser.json({limit: '10mb'}));
app.use(methodOverride());
app.use(cors());

// app.all('/api/missions', function(req, res, next) {
//     console.log(req);
//     res.header("Access-Control-Allow-Origin", "*");
//     res.header('Access-Control-Allow-Methods: GET, PUT, POST, DELETE, OPTIONS');
//     res.header('Access-Control-Max-Age: 1000');
//     res.header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
//     next();
//  });

app.get('/api', function(req, res) {
    res.send('Api is running');
});

app.post('/api/images', function(req,res) {
    if (!req.body.image)
    {
        res.statusCode = 400;
        res.send({ error: 'no image data'});
    }

    var hash = sha1.create();
    var timestamp = new Date().getTime();
    var query = 'timestamp=' + timestamp + config.get('cloudinary:secret');
    hash.update(query);

    axios.post(
        config.get('cloudinary:url'),
        {
            file: req.body.image,
            api_key: config.get('cloudinary:key'),
            timestamp: timestamp,
            signature: hash.hex()
        }
    )
    .then((img_res) => {
        res.send({
            status: 'OK',
            url: img_res.data.url
        });
    })
    .catch((img_err) => {
        res.statusCode = 400;
        res.send({
            error: img_err.response ? img_err.response.statusText : img_err.message
        })
    })
});

app.get('/api/missions', function(req, res) {
    return MissionModel.find( 
        req.query,
        ['_id','mission_name','mission_description','project','game','thumbnail', 'date_of'],
        {
            sort: {
                date_of: -1
            }
        },
        function (err, missions) {
            console.log(missions);
            if (!err) {
                return res.send(missions);
            } else {
                res.statusCode = 500;
                log.error('Internal error(%d): %s', res.statusCode, err.message);
                return res.send({ error: 'Server error'});
            }
    });
});

app.post('/api/missions', function(req, res) {
    var mission = new MissionModel({
        mission_name: req.body.mission_name,
        mission_description: req.body.mission_description,
        project: req.body.project,
        game: req.body.game,
        date_of: req.body.date_of,
        thumbnail: req.body.thumbnail,
        task_blue: req.body.task_blue,
        task_red: req.body.task_red,
        task_green: req.body.task_green,
        conventions: req.body.conventions,
        screenshots: req.body.screenshots
    });

    mission.save(function (err) {
        if (!err) {
            log.info('mission created');
            return res.send({ status: 'OK', mission:mission});
        } else {
            console.log(err);
            if (err.name == 'ValidationError') {
                res.statusCode = 400;
                res.send({ error: 'Validation error'});
            } else {
                res.statusCode = 500;
                res.send({ error: 'Server error'});
            }
            log.error('Internal error(%d): %s', res.statusCode, err.message);
        }
    });
});

app.get('/api/missions/:id', function(req, res) {
    return MissionModel.findById(req.params.id, function (err, mission) {
        if (!mission) {
            res.statusCode = 404;
            return res.send({ error: 'Not found'});
        }

        if (!err) {
            return res.send({ status: 'OK', mission:mission});
        } else {
            res.statusCode = 500;
            log.error('Internal error(%d): %s', res.statusCode, err.message);
            return res.send({ error: 'Server error'});
        }
    });
});

app.put('/api/missions/:id', function(req, res) {
    return MissionModel.findById(req.params.id, function (err, mission) {
        if (!mission) {
            res.statusCode = 404;
            return res.send({error: 'Not found' });
        }

        mission.mission_name = req.body.mission_name;
        mission.mission_description = req.body.mission_description;
        mission.game = req.body.game;
        mission.project = req.body.project;
        mission.date_of = req.body.date_of;
        mission.thumbnail = req.body.thumbnail;
        mission.task_blue = req.body.task_blue;
        mission.task_green = req.body.task_green;
        mission.task_red = req.body.task_red;
        mission.screenshots = req.body.screenshots;
        return mission.save(function (err) {
            if (!err) {
                log.info('MissionModel updated');
                return res.send({ status: 'OK', mission:mission});
            } else {
                if (err.name == 'ValidationError') {
                    res.statusCode = 400;
                    res.send({error: 'Validation error'});
                } else {
                    res.statusCode = 500;
                    res.send({error: 'Server error'});
                }
                log.error('Internal error(%d): %s',res.statusCode, err.message);
            }
        });
    });
});

app.delete('/api/missions/:id', function(req, res) {
    return MissionModel.findById(req.params.id, function(err, mission) {
        if (!mission) {
            res.statusCode = 404;
            return res.send({ error: 'Not found'});
        }
        return mission.remove(function (err) {
            if (!err) {
                log.info('mission removed');
                return res.send({status: 'OK'});
            } else {
                res.statusCode = 500;
                log.error('Internal error(%d): %s', res.statusCode, err.message);
                return res.send({ error: 'Server error'});
            }
        });
    });
});

app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next){
    res.status(404);
    log.debug('Not found URL: %s', req.url);
    res.send({error: 'Not found'});
    return;
});

app.use(function(err, res, next){
    res.status(err.status || 500);
    log.error('Internal error(%d): %s', res.statusCode, err.message);
    res.send({error: err.message});
    return;
});

app.listen(config.get('port'), function(){
    console.log('Express server listen on port ' + config.get('port'));
});