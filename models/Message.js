const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  room: {
    type:    String,
    default: 'general',
    index:   true,
  },
  sender: {
    type:     String,
    required: true,
  },
  senderAvatar: {
    type:    String,
    default: '',
  },
  content: {
    type:      String,
    required:  true,
    maxlength: 8000,
  },
  // 'text' | 'image' | 'video' | 'audio' | 'voice-ptt'
  type: {
    type:    String,
    enum:    ['text', 'image', 'video', 'audio', 'voice-ptt'],
    default: 'text',
  },
  // Only for audio/voice: duration in seconds
  audioDuration: {
    type:    Number,
    default: 0,
  },
  replyTo: {
    messageId: { type: mongoose.Schema.Types.ObjectId, default: null },
    sender:    { type: String, default: null },
    content:   { type: String, default: null },
    type:      { type: String, default: 'text' },
  },
  readBy:  { type: [String], default: [] },
  status:  { type: String, enum: ['sent','delivered','seen'], default: 'sent' },

  // Edit/delete support
  edited:    { type: Boolean, default: false },
  editedAt:  { type: Date,    default: null  },
  deleted:   { type: Boolean, default: false },

  timestamp: { type: Date, default: Date.now, index: true },
}, { timestamps: false });

messageSchema.index({ room: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
