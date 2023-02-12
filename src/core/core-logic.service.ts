import { CoreService } from './core.service';
import { Role } from 'src/auth/roles/role.enum';
import { SurveyDocument } from 'src/schemas/survey.schema';
import { Types } from 'mongoose';
import { UserDocument } from 'src/schemas/user.schema';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SurveyResponseDocument } from 'src/schemas/surveyResponse.schema';
import { QVOption } from 'src/schemas/questions/qv/qv-options.schema';

@Injectable()
export class CoreLogicService {
  constructor(private coreService: CoreService) {}
  // user
  validateUserIsAdmin(user: UserDocument): boolean {
    if (!user) throw new ForbiddenException('User does not exist [CS0016]');
    if (user.roles.includes(Role.Admin)) {
      return true;
    } else {
      throw new UnauthorizedException(
        'This is an Admin only function call. [CS0023]',
      );
    }
  }

  // survey and user
  validateSurveyOwnership(user: UserDocument, survey: SurveyDocument): boolean {
    if (!user) throw new ForbiddenException('User does not exist [CS0016]');
    if (!survey) throw new ForbiddenException('Survey does not exist [CS0017]');
    if (user.roles.includes(Role.Admin) || user.surveys.includes(survey._id)) {
      return true;
    } else {
      throw new UnauthorizedException();
    }
  }

  validateUserAccessBySurveyId(
    user: UserDocument,
    surveyId: Types.ObjectId,
  ): boolean {
    if (!user) throw new ForbiddenException('User does not exist [CS0016]');
    if (user.roles.includes(Role.Admin) || user.surveys.includes(surveyId)) {
      return true;
    } else {
      throw new UnauthorizedException();
    }
  }

  validateSurveyOpen(survey: SurveyDocument): boolean {
    if (!survey.settings.isAvailable) {
      throw new ForbiddenException(
        'The survey is currently not avaliable. Please contact the survey designer if you think this is a mistake. [CL0030]',
      );
    } else {
      return true;
    }
  }

  validateSurveySKey(survey: SurveyDocument, sKey: string): boolean {
    if (survey.settings.hasSKey && sKey !== survey.settings.sKeyValue) {
      throw new ForbiddenException(
        'The key is incorrect. Please contact the survey designer if you think this is a mistake. [CL0040]',
      );
    } else {
      return true;
    }
  }

  requireUkey(survey: SurveyDocument, uKey: string): boolean {
    if (survey.settings.hasUKey && uKey === undefined) {
      throw new ForbiddenException(
        'The survey requires a unique code. Please contact the survey designer if you think this is a mistake. [CL0050]',
      );
    } else {
      return true;
    }
  }

  validateUKeyAvaliable(
    surveyResponse: SurveyResponseDocument | undefined,
  ): boolean {
    if (surveyResponse === undefined || surveyResponse === null) {
      return true;
    }
    if (surveyResponse.status === 'Complete') {
      throw new ForbiddenException(
        'The survey has been submitted. Please contact the survey designer if you think this is a mistake. [CL0662]',
      );
    } else {
      return false;
    }
  }

  validateUUIDAvaliable(
    surveyResponse: SurveyResponseDocument | undefined,
  ): boolean {
    if (surveyResponse === undefined || surveyResponse === null) {
      throw new ForbiddenException(
        'The uuid is not correct. Something is wrong with the system [SS082]',
      );
    }
    // TODO: Also need to check time validation here.
    if (surveyResponse.status === 'Complete') {
      throw new ForbiddenException(
        'The survey has been submitted. Please contact the survey designer if you think this is a mistake. [CL0082]',
      );
    } else {
      return true;
    }
  }

  validateSurveyResponseUKey(
    surveyResponse: SurveyResponseDocument | undefined,
    uKey: string,
  ): boolean {
    if (surveyResponse.uKey === uKey) {
      return true;
    } else {
      throw new ForbiddenException(
        'The uKey does not match the key in the response. Something is wrong [CL0092]',
      );
    }
  }

  validateContentAvaliable(item: any, typeName: string) {
    if (!item) {
      throw new BadRequestException(
        'The ' + typeName + ' does not exist. [CL0105]',
      );
    }
  }
  // utils, consider breaking it to sepearate file
  // any?
  mergeIdListWithDocList(
    idList: Types.ObjectId[],
    docList: any, //list of documents
    removeField?: string[],
  ) {
    const mergedDoc = idList.map((id) => {
      const doc = docList.find((doc) => doc._id.equals(id) && doc)._doc;
      if (removeField) {
        removeField.forEach((field) => delete doc[field]);
      }
      if (!doc) return undefined;
      return doc;
    });
    return mergedDoc;
  }

  stripHtml = (html) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  fixQVOptionID(qvOptionList: QVOption[]) {
    qvOptionList.forEach((qvOption) => {
      qvOption.optionId = this.stripHtml(qvOption.optionName).replace(' ', '_');
    });
    return qvOptionList;
  }
}
