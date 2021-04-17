import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseProvider } from './mongoose.provider';

@Module({
    providers: [...MongooseProvider, ConfigService],
    exports: [...MongooseProvider],
    imports: [ConfigModule]
})
export class DatabaseModule {}
