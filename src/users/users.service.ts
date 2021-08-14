import { CoreService } from 'src/core/core.service';
import { CreateUserDto } from './dtos/createUser.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { User, UserDocument } from 'src/schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private coreService: CoreService,
  ) {}

  async findAllUsers(): Promise<User[] | undefined> {
    return await this.userModel.find({}).exec();
  }

  async findUserById(userId: Types.ObjectId): Promise<User | undefined> {
    return this.coreService.getUserById(userId);
  }

  async createNewUser(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return await createdUser.save();
  }

  async updateUserPicByEmail(
    email: string,
    profilePictureURI: string,
  ): Promise<UserDocument> {
    const UserInfo = await this.userModel.findOne({ email: email }).exec();
    UserInfo.profilePictureURI = profilePictureURI;
    return await this.userModel
      .findByIdAndUpdate(UserInfo._id, UserInfo, { returnOriginal: false })
      .exec();
  }

  async updateUserbyId(
    userId: Types.ObjectId,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.userModel
      .findByIdAndUpdate(userId, updateUserDto, { returnOriginal: false })
      .exec();
  }

  async removeUserById(id: string): Promise<User | undefined> {
    return await this.userModel.findByIdAndRemove(id).exec();
  }
}
