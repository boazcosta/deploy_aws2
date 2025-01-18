const express = require('express');
const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Analysis Service funcionando!');
});

app.listen(3003, () => {
  console.log('Analysis Service rodando na porta 3003');
});