// Legacy path kept so any old page still calling /.netlify/functions/beehiiv
// now subscribes people in MailerLite. Safe to delete once old pages are gone.
exports.handler = require('./mailerlite').handler;
