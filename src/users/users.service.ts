import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { CreateUserDto } from './dtos/createUser.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) {}

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.userModel.findOne({ email: email }).exec();
  }

  async createNewUser(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async updateUserPicByEmail(
    email: string,
    profilePictureURI: string,
  ): Promise<User> {
    const UserInfo = await this.userModel.findOne({ email: email }).exec();
    UserInfo.profilePictureURI = profilePictureURI;
    return this.userModel
      .findByIdAndUpdate(UserInfo._id, UserInfo, { returnOriginal: false })
      .exec();
  }

  async findUserById(id: string): Promise<User | undefined> {
    return this.userModel.findOne({ _id: id }).exec();
  }
}
