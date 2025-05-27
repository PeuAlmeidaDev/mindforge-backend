import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './lib/prisma';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import goalRoutes from './routes/goal.routes';
import battleRoutes from './routes/battle.routes';
import houseRoutes from './routes/house.routes';
import interestRoutes from './routes/interest.routes';
import { authMiddleware } from './middlewares/auth.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { setupHouseMapping } from './services/house-assignment.service';

// Carregar variáveis de ambiente
dotenv.config();

// Criar aplicação Express
const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/goals', authMiddleware, goalRoutes);
app.use('/api/battles', authMiddleware, battleRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/interests', interestRoutes);

// Rota de teste
app.get('/', (req, res) => {
  res.send('API do Mindforge funcionando! 🚀');
});

// Middleware de tratamento de erros (deve ser o último)
app.use(errorMiddleware);

// Iniciar o servidor
app.listen(PORT, async () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  
  // Inicializar o mapeamento de casas
  await setupHouseMapping();
  console.log('Mapeamento de casas inicializado');
});

// Tratamento de erros e encerramento
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('Conexão com o banco de dados fechada');
  process.exit(0);
});

export { prisma };
export default app; 