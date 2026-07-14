import { Injectable } from '@nestjs/common';

export interface ModerationResult {
  status: 'published' | 'pending';
  riskLevel: 'low' | 'medium' | 'high';
  reason: string | null;
}

@Injectable()
export class ModerationService {
  private readonly highRiskTerms = [
    '代考',
    '出售答案',
    '枪手',
    '博彩',
    '裸聊',
    '高利贷',
    '刷单返利',
    '校园贷',
    '裸照',
    '买卖账号',
    '违禁药品',
  ];

  private readonly reviewTerms = ['加微信', '私下转账', '校外兼职', '内部渠道', '有偿代写', '快速赚钱'];

  inspect(title: string, content: string): ModerationResult {
    const text = `${title}\n${content}`.replace(/\s+/g, ' ').toLowerCase();
    const high = this.highRiskTerms.find((term) => text.includes(term));
    if (high) {
      return { status: 'pending', riskLevel: 'high', reason: `命中高风险词：${high}` };
    }

    const review = this.reviewTerms.find((term) => text.includes(term));
    const contact = /(?:1[3-9]\d{9}|(?:vx|v信|微信)[:：\s]*[a-z0-9_-]{5,})/i.test(text);
    if (review || contact) {
      return {
        status: 'pending',
        riskLevel: 'medium',
        reason: review ? `需核实内容：${review}` : '包含站外联系方式，需人工复核',
      };
    }

    return { status: 'published', riskLevel: 'low', reason: null };
  }
}
