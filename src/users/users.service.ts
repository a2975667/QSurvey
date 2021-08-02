import { CoreService } from 'src/core/core.service';
import { CreateUserDto } from './dtos/createUser.dto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from 'src/auth/roles/role.enum';
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
  ): Promise<User> {
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

  async verifyUserPermissionById(
    userId: Types.ObjectId,
    allAccessRoles: Role[],
    ownershipSurveyId?: Types.ObjectId,
  ) {
    console.log('This function is set to deprecate. Please rework it.');
    const userInfo = await this.findUserById(userId);
    if (
      userInfo.roles.some((item) => allAccessRoles.includes(item)) ||
      userInfo.surveys.includes(ownershipSurveyId)
    )
      return true;
    else throw new UnauthorizedException();
  }
}
