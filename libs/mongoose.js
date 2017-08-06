var mongoose = require('mongoose');
var log      = require('./log')(module);
var config   = require('./config');

mongoose.connect(config.get('mongoose:uri'));
var db = mongoose.connection;

db.on('error', function (err) {
    log.error('connection error:', err.message);
});
db.once('open', function callback () {
    log.info('Connected to DB!');
});

var Schema = mongoose.Schema;

// Schemas

var Missions = new Schema({
    mission_name: { type: String, required: true},
    mission_description: { type: String },
    project: { 
        type: String, 
        enum: ['wog', 'miniwog'],
        required: true 
    },
    game: { 
        type: String, 
        enum: ['arma2', 'arma3'],
        required: true 
    },
    author: { type: String },
    date_of: {
        type: Date,
        default: Date.now()
    },
    images: {
        thumbnail: {
            type: String
        }
    }
});

var MissionModel = mongoose.model('Missions', Missions);

module.exports.MissionModel = MissionModel;