import { Module } from '@nestjs/common';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { PaginationService } from '../../shared/pagination/pagination.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [JwtModule.registerAsync({ inject: [ConfigService], useFactory: (c: ConfigService) => ({ secret: c.get('JWT_SECRET', 'dev-secret') }) })],
  controllers: [FavoritesController],
  providers: [FavoritesService, PaginationService],
  exports: [FavoritesService],
})
export class FavoritesModule {}
