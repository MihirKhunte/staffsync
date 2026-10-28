import 'dotenv/config'; import mongoose from 'mongoose'; import bcrypt from 'bcryptjs';
import { User, Announcement } from './models.js';
await mongoose.connect(process.env.MONGO_URI); await mongoose.connection.dropDatabase();
const password = await bcrypt.hash('Demo@1234', 10);
const hr = await User.create({ name: 'Hana Rao', email: 'hr@staffsync.dev', password, role: 'hr', department: 'People', title: 'Head of People' });
const mgr = await User.create({ name: 'Marcus Lee', email: 'manager@staffsync.dev', password, role: 'manager', department: 'Engineering', title: 'Engineering Manager' });
const team = [['Ela Park', 'Engineering', 'Frontend Engineer'], ['Dev Nair', 'Engineering', 'Backend Engineer'], ['Sara Cole', 'Design', 'Product Designer']];
for (const [i, [name, department, title]] of team.entries())
  await User.create({ name, email: i ? `${name.split(' ')[0].toLowerCase()}@staffsync.dev` : 'employee@staffsync.dev', password, department, title, manager: mgr._id });
await Announcement.create({ title: 'Quarterly offsite is on', body: 'Pick your travel dates in the Leave page by Friday.', author: hr._id });
console.log('Seeded. Password for all demo users: Demo@1234'); process.exit();
