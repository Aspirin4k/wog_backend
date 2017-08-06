var express         = require('express');
var path            = require('path');
var favicon         = require('serve-favicon');
var morgan          = require('morgan');
var bodyParser      = require('body-parser');
var methodOverride  = require('method-override');
var log             = require('./libs/log')(module);
var config          = require('./libs/config');
var MissionModel = require('./libs/mongoose').MissionModel;

var app = express();

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(methodOverride());

app.all('/api/missions', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
 });

app.get('/api', function(req, res) {
    res.send('Api is running');
});

app.get('/api/missions', function(req, res) {
    return MissionModel.find(function (err, missions) {
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
        author: req.body.author,
        date_of: req.body.date_of,
        images: req.body.images
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
        mission.date_of = req.body.date_of
        mission.author = req.body.author;
        mission.images = req.body.images;
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