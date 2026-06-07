import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { EvaluationService } from './evaluation.service';

@ApiTags('Evaluation')
@ApiBearerAuth()
@Controller('rooms')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post(':roomId/evaluations')
  @ApiOperation({ summary: '提交评价(契约 §5.1)' })
  create(
    @Param('roomId', ParseIntPipe) roomId: number,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateEvaluationDto,
  ) {
    return this.evaluationService.create(roomId, userId, dto);
  }

  @Get(':roomId/evaluations')
  @ApiOperation({ summary: '列出房间内评价(契约 §5.2)' })
  list(@Param('roomId', ParseIntPipe) roomId: number) {
    return this.evaluationService.listInRoom(roomId);
  }
}
