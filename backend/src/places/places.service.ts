import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  // 地点联想：聚合 Match_Room.meet_location + Carpool_Room.start/end_location，
  // 按出现频次降序；当有 q 时前缀匹配排在前。
  //   · q 为空 → 返回历史 Top N（常用地点）
  //   · q 非空 → 包含匹配；前缀匹配的优先
  async suggest(q: string, limit = 8) {
    const v = (q || '').trim();
    const lim = Math.min(Math.max(limit, 1), 20);

    type Row = { place: string; freq: bigint };

    let rows: Row[];
    if (!v) {
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT place, SUM(c) AS freq FROM (
          SELECT meet_location AS place, COUNT(*) AS c
            FROM Match_Room
            WHERE meet_location IS NOT NULL AND meet_location <> ''
            GROUP BY meet_location
          UNION ALL
          SELECT start_location AS place, COUNT(*) AS c
            FROM Carpool_Room
            WHERE start_location IS NOT NULL AND start_location <> ''
            GROUP BY start_location
          UNION ALL
          SELECT end_location AS place, COUNT(*) AS c
            FROM Carpool_Room
            WHERE end_location IS NOT NULL AND end_location <> ''
            GROUP BY end_location
        ) t
        GROUP BY place
        ORDER BY freq DESC
        LIMIT ${Prisma.raw(String(lim))}
      `;
    } else {
      const like = `%${v}%`;
      const prefix = `${v}%`;
      rows = await this.prisma.$queryRaw<Row[]>`
        SELECT place,
               SUM(c) AS freq,
               MAX(is_prefix) AS prefix_hit
        FROM (
          SELECT meet_location AS place, COUNT(*) AS c,
                 CASE WHEN meet_location LIKE ${prefix} THEN 1 ELSE 0 END AS is_prefix
            FROM Match_Room
            WHERE meet_location LIKE ${like}
            GROUP BY meet_location
          UNION ALL
          SELECT start_location AS place, COUNT(*) AS c,
                 CASE WHEN start_location LIKE ${prefix} THEN 1 ELSE 0 END AS is_prefix
            FROM Carpool_Room
            WHERE start_location LIKE ${like}
            GROUP BY start_location
          UNION ALL
          SELECT end_location AS place, COUNT(*) AS c,
                 CASE WHEN end_location LIKE ${prefix} THEN 1 ELSE 0 END AS is_prefix
            FROM Carpool_Room
            WHERE end_location LIKE ${like}
            GROUP BY end_location
        ) t
        GROUP BY place
        ORDER BY prefix_hit DESC, freq DESC
        LIMIT ${Prisma.raw(String(lim))}
      `;
    }

    return {
      list: rows.map((r) => ({ place: r.place, freq: Number(r.freq) })),
    };
  }
}
