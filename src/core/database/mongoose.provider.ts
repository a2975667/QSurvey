import { ConfigModule, ConfigService } from '@nestjs/config';
import * as mongoose from 'mongoose';

export const MongooseProvider = [
  {
    provide: 'DATABASE_CONNECTION',
    inject: [ConfigService],
    useFactory: async (configService: ConfigService): Promise<typeof mongoose> =>
      await mongoose.connect(configService.get('MONGO_URI'), {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      imports: [ConfigModule]
  },
];