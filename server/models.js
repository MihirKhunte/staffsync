import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ref = n => ({ type: Schema.Types.ObjectId, ref: n });

export const User = model('User', new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,

  // Profile photo URL stored in MongoDB
  avatar: { type: String, default: '' },

  role: {
    type: String,
    enum: ['hr', 'manager', 'employee'],
    default: 'employee'
  },
  department: String,
  title: String,
  manager: ref('User'),
  leaveBalance: { type: Number, default: 18 }
}, { timestamps: true }));

const att = new Schema({
  user: ref('User'),
  date: String,
  checkIn: Date,
  checkOut: Date
});

att.index({ user: 1, date: 1 }, { unique: true });

export const Attendance = model('Attendance', att);

const lv = new Schema({
  user: ref('User'),
  type: {
    type: String,
    enum: ['annual', 'sick', 'personal']
  },
  from: Date,
  to: Date,
  days: Number,
  reason: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: ref('User')
}, { timestamps: true });

lv.index({ status: 1, user: 1 });

export const Leave = model('Leave', lv);

export const Announcement = model('Announcement', new Schema({
  title: String,
  body: String,
  author: ref('User')
}, { timestamps: true }));
