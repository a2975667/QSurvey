import { Module } from '@nestjs/common';
import { MongooseProvider } from './mongoose.provider';

@Module({
    providers: [...MongooseProvider],
    exports: [...MongooseProvider]
})
export class DatabaseModule {}
