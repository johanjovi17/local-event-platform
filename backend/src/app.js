const express = require('express');
const eventRoutes = require('./routes/eventRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const organizerRoutes = require('./routes/organizerRoutes');
const errorHandler = require('./middleware/errorHandler');
const { uploadDirectory } = require('./middleware/eventImageUpload');

const app = express();

app.use(express.json());
app.use(
  '/api/uploads',
  express.static(uploadDirectory, {
    dotfiles: 'deny',
    index: false,
    maxAge: '1y',
  }),
);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/organizers', organizerRoutes);
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});
app.use(errorHandler);

module.exports = app;
