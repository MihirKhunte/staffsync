
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { User, Attendance, Leave, Announcement } from './models.js';

const app = express();

app.use(
  helmet(),
  cors({ origin: process.env.CLIENT_URL || true }),
  express.json()
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Please upload a JPG, PNG, or WebP image.'));
    }
  },
});

const wrap = f => (q, s, n) => f(q, s, n).catch(n);
const fail = (m, status) => Object.assign(new Error(m), { status });

const sign = u =>
  jwt.sign(
    { id: u._id, role: u.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

const safe = u => ({ ...u.toObject(), password: undefined });
const today = () => new Date().toISOString().slice(0, 10);

const auth = wrap(async (req, _s, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select('-password');
  } catch {}

  next(req.user ? undefined : fail('Please sign in again', 401));
});

const only = (...roles) => (req, _s, next) =>
  next(
    roles.includes(req.user.role)
      ? undefined
      : fail('You do not have access to this', 403)
  );

const api = express.Router();

// Authentication
api.post(
  '/auth/login',
  rateLimit({ windowMs: 6e4, limit: 20 }),
  wrap(async (req, res) => {
    const u = await User.findOne({
      email: String(req.body.email || '').toLowerCase(),
    });

    if (!u || !(await bcrypt.compare(req.body.password || '', u.password))) {
      throw fail('Email or password is incorrect', 400);
    }

    res.json({ token: sign(u), user: safe(u) });
  })
);

api.post(
  '/auth/register',
  wrap(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || (password || '').length < 6) {
      throw fail(
        'Enter your name, email and a password of 6+ characters',
        400
      );
    }

    const u = await User.create({
      name,
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 10),
    });

    res.status(201).json({ token: sign(u), user: safe(u) });
  })
);

// All routes below require authentication
api.use(auth);

// Get logged-in user's profile
api.get('/me', (req, res) => res.json(req.user));

// Upload or replace logged-in user's profile photo
api.patch(
  '/me/avatar',
  upload.single('avatar'),
  wrap(async (req, res) => {
    if (!req.file) {
      throw fail('Please choose a photo to upload.', 400);
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'staffsync/avatars',
          public_id: `user-${req.user._id}`,
          overwrite: true,
          resource_type: 'image',
        },
        (error, uploadedImage) => {
          if (error) reject(error);
          else resolve(uploadedImage);
        }
      );

      stream.end(req.file.buffer);
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      throw fail('User account not found.', 404);
    }

    res.json(updatedUser);
  })
);

// Employees
api.get(
  '/employees',
  only('hr', 'manager'),
  wrap(async (req, res) => {
    const q = req.user.role === 'manager'
      ? { manager: req.user._id }
      : {};

    if (req.query.q) {
      const search = String(req.query.q).replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );
      q.name = new RegExp(search, 'i');
    }

    res.json(
      await User.find(q).select('-password').sort('name').limit(100)
    );
  })
);

api.post(
  '/employees',
  only('hr'),
  wrap(async (req, res) => {
    const b = req.body;

    if (!b.name || !b.email) {
      throw fail('Name and email are required', 400);
    }

    const employee = await User.create({
      ...b,
      email: b.email.toLowerCase(),
      manager: b.manager || undefined,
      password: await bcrypt.hash(b.password || 'Welcome@123', 10),
    });

    res.status(201).json(safe(employee));
  })
);

// Attendance
api.get(
  '/attendance/today',
  wrap(async (req, res) => {
    res.json(
      await Attendance.findOne({
        user: req.user._id,
        date: today(),
      })
    );
  })
);

api.post(
  '/attendance/check-in',
  wrap(async (req, res) => {
    res.json(
      await Attendance.findOneAndUpdate(
        { user: req.user._id, date: today() },
        { $setOnInsert: { checkIn: new Date() } },
        { upsert: true, new: true }
      )
    );
  })
);

api.post(
  '/attendance/check-out',
  wrap(async (req, res) => {
    const a = await Attendance.findOneAndUpdate(
      {
        user: req.user._id,
        date: today(),
        checkOut: null,
      },
      { checkOut: new Date() },
      { new: true }
    );

    if (!a) {
      throw fail('Check in before checking out', 400);
    }

    res.json(a);
  })
);

// Leave requests
api.get(
  '/leaves',
  wrap(async (req, res) => {
    let q = { user: req.user._id };

    if (req.user.role === 'hr') {
      q = {};
    }

    if (req.user.role === 'manager') {
      const teamIds = await User.find({
        manager: req.user._id,
      }).distinct('_id');

      q = {
        user: { $in: [...teamIds, req.user._id] },
      };
    }

    res.json(
      await Leave.find(q)
        .populate('user', 'name department')
        .sort('-createdAt')
        .limit(100)
    );
  })
);

api.post(
  '/leaves',
  wrap(async (req, res) => {
    const { type, from, to, reason } = req.body;
    const f = new Date(from);
    const t = new Date(to);

    if (!(t >= f)) {
      throw fail('End date must be on or after the start date', 400);
    }

    let days = 0;

    for (const d = new Date(f); d <= t; d.setDate(d.getDate() + 1)) {
      if (![0, 6].includes(d.getDay())) days++;
    }

    if (!days) {
      throw fail('Those dates fall on a weekend', 400);
    }

    if (type === 'annual' && days > req.user.leaveBalance) {
      throw fail(
        `You have ${req.user.leaveBalance} annual days left`,
        400
      );
    }

    const existingLeave = await Leave.exists({
      user: req.user._id,
      status: { $ne: 'rejected' },
      from: { $lte: t },
      to: { $gte: f },
    });

    if (existingLeave) {
      throw fail('You already have leave in that range', 400);
    }

    res.status(201).json(
      await Leave.create({
        user: req.user._id,
        type,
        from: f,
        to: t,
        days,
        reason,
      })
    );
  })
);

api.patch(
  '/leaves/:id',
  only('hr', 'manager'),
  wrap(async (req, res) => {
    const l = await Leave.findById(req.params.id).populate('user');

    if (!l || l.status !== 'pending') {
      throw fail('This request was already reviewed', 400);
    }

    if (
      req.user.role === 'manager' &&
      String(l.user.manager) !== String(req.user._id)
    ) {
      throw fail('This person is not on your team', 403);
    }

    l.status =
      req.body.status === 'approved' ? 'approved' : 'rejected';
    l.reviewedBy = req.user._id;

    await l.save();

    if (l.status === 'approved' && l.type === 'annual') {
      await User.updateOne(
        { _id: l.user._id },
        { $inc: { leaveBalance: -l.days } }
      );
    }

    res.json(l);
  })
);

// Announcements
api.get(
  '/announcements',
  wrap(async (_q, res) => {
    res.json(
      await Announcement.find()
        .populate('author', 'name')
        .sort('-createdAt')
        .limit(20)
    );
  })
);

api.post(
  '/announcements',
  only('hr'),
  wrap(async (req, res) => {
    res.status(201).json(
      await Announcement.create({
        ...req.body,
        author: req.user._id,
      })
    );
  })
);

// Dashboard statistics
api.get(
  '/stats',
  only('hr', 'manager'),
  wrap(async (_q, res) => {
    const [byDept, present, pending, total] = await Promise.all([
      User.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$department', 'Unassigned'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Attendance.countDocuments({ date: today() }),
      Leave.countDocuments({ status: 'pending' }),
      User.countDocuments(),
    ]);

    res.json({ byDept, present, pending, total });
  })
);

app.use('/api', api);

app.use((e, _q, res, _n) => {
  const status =
    e.status ||
    (e instanceof multer.MulterError
      ? 400
      : e.code === 11000 || e.name === 'ValidationError'
        ? 400
        : 500);

  res.status(status).json({
    message:
      e.code === 11000
        ? 'That email is already registered'
        : e.message || 'Something went wrong',
  });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log('StaffSync API ready');
    });
  })
  .catch(error => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });