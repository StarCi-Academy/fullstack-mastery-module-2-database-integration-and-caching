/**
 * AppModule — dang ky cac thanh phan cua feature App.
 * (EN: AppModule — registers components for App feature.)
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatModule } from './modules/cat';

/**
 * AppModule â€” Cấu hình káº¿t ná»‘i MongoDB vÃ  quáº£n lÃ½ modules.
 * (EN: Configures MongoDB connection and manages modules.)
 */
@Module({
  imports: [
    // Káº¿t ná»‘i MongoDB vá»›i URI tá»« Docker config
    // (EN: MongoDB connection with URI from Docker config)
    MongooseModule.forRoot(
      'mongodb://starci_admin:starci_password@localhost:27017/starci_db?authSource=admin',
    ),

    // Feature Modules
    CatModule,
  ],
})
export class AppModule {}
