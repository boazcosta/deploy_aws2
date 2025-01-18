const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Map Service funcionando!');
});

app.listen(3002, () => {
  console.log('Map Service rodando na porta 3002');
});