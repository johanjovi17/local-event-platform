const express = require('express');
const eventRoutes = require('./routes/eventRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});
app.use(errorHandler);

module.exports = app;
