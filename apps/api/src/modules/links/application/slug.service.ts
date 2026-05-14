import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

@Injectable()
export class SlugService {
  generate(length = 6): string {
    let slug = '';
    for (let index = 0; index < length; index += 1) {
      slug += BASE62[randomInt(BASE62.length)];
    }
    return slug;
  }
}
