var mongoose = require("mongoose");

var topicSchema = mongoose.Schema({
    title: String,
    desc: String,
    blogs:[
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Blog'
      }
    ]
});

module.exports = mongoose.model("Topic", topicSchema);
