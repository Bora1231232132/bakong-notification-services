import { CreateUserDto } from './dto/create-user.dto'
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from 'src/entities/user.entity'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  async findByUsername(username: string) {
    return this.repo.findOne({ where: { username } })
  }

  async create(dto: CreateUserDto) {
    const { password } = dto
    let user = this.repo.create({ ...dto, password: await bcrypt.hash(password, 10) })
    user = await this.repo.save(user)
    return user
  }

  increementFailLoginAttempt(id: number) {
    return this.repo.increment({ id }, 'failLoginAttempt', 1)
  }

  resetFailLoginAttempt(id: number) {
    return this.repo.update({ id }, { failLoginAttempt: 0 })
  }

  async findAll() {
    return this.repo.find({
      select: [
        'id',
        'username',
        'displayName',
        'role',
        'failLoginAttempt',
        'createdAt',
        'updatedAt',
      ],
    })
  }

  async findById(id: number) {
    return this.repo.findOne({
      where: { id },
      select: [
        'id',
        'username',
        'displayName',
        'role',
        'failLoginAttempt',
        'createdAt',
        'updatedAt',
      ],
    })
  }
}
