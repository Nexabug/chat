const mongoose = require('mongoose');
const crypto   = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type:      String,
    required:  true,
    trim:      true,
    minlength: 2,
    maxlength: 24,
    unique:    true,   // enforce at DB level
    index:     true,
  },
  passwordHash: {
    type:     String,
    required: true,
  },
  avatar: {
    type:    String,
    default: '',
  },
  customAvatar: {
    type:    String,
    default: null,
  },
  sessionId: {
    type:    String,
    default: null,
  },
  isOnline: {
    type:    Boolean,
    default: false,
  },
  lastSeen: {
    type:    Date,
    default: Date.now,
  },
}, { timestamps: true });

// Auto-generate avatar from username
userSchema.pre('save', function (next) {
  if (!this.avatar) {
    const seed  = encodeURIComponent(this.username);
    const color = Math.floor(Math.random() * 360);
    this.avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear&rotate=${color}&fontSize=38`;
  }
  next();
});

// Static: hash a password
userSchema.statics.hashPassword = (pwd) =>
  crypto.createHash('sha256').update(String(pwd)).digest('hex');

// Instance: verify password
userSchema.methods.checkPassword = function (pwd) {
  return this.passwordHash === crypto.createHash('sha256').update(String(pwd)).digest('hex');
};

module.exports = mongoose.model('User', userSchema);
