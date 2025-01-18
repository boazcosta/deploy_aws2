const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('User Service funcionando!');
});

app.listen(3001, () => {
  console.log('User Service rodando na porta 3001');
});