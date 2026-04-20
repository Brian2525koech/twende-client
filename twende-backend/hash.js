const bcrypt = require('bcrypt')
bcrypt.hash('demo1234', 12).then(hash => console.log('demo1234: -', hash))
bcrypt.hash('admin1234', 12).then(hash => console.log('admin1234: -', hash))