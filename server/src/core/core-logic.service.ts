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
        'The survey is currently not available. Please contact the survey designer if you think this is a mistake. [CL0030]',
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
  // also this does not handle the merge elegantly.
  // the correct way should be writing lookup function
  // and then projecting the correct fields
  // any?
  mergeIdListWithDocList(
    idList: Types.ObjectId[],
    docList: any, //list of documents
    removeField?: string[],
  ) {
    console.log('[DEBUG] mergeIdListWithDocList - Starting merge');
    console.log(
      '[DEBUG] mergeIdListWithDocList - ID list length:',
      idList?.length,
    );
    console.log(
      '[DEBUG] mergeIdListWithDocList - Doc list length:',
      docList?.length,
    );

    if (!idList || !Array.isArray(idList) || idList.length === 0) {
      console.log(
        '[DEBUG] mergeIdListWithDocList - Empty or invalid ID list, returning empty array',
      );
      return [];
    }

    if (!docList || !Array.isArray(docList) || docList.length === 0) {
      console.log(
        '[DEBUG] mergeIdListWithDocList - Empty or invalid document list, returning empty array',
      );
      return [];
    }

    const mergedDoc = idList
      .map((id, index) => {
        // Skip invalid IDs
        if (!id) {
          console.log(
            `[DEBUG] mergeIdListWithDocList - Skipping invalid ID at index ${index}`,
          );
          return undefined;
        }

        console.log(
          `[DEBUG] mergeIdListWithDocList - Processing ID: ${id.toString()} (index ${index})`,
        );

        // Find matching document by ID
        const foundDoc = docList.find((doc) => {
          // Make sure document and its ID exist
          if (!doc || !doc._id) return false;

          // Compare IDs - handle both string and ObjectId types
          if (typeof doc._id.equals === 'function') {
            // If ObjectId with equals method
            return doc._id.equals(id);
          } else {
            // If string comparison needed
            return doc._id.toString() === id.toString();
          }
        });

        // If no matching document found, return undefined
        if (!foundDoc) {
          console.log(
            `[DEBUG] mergeIdListWithDocList - No document found for ID: ${id.toString()}`,
          );
          return undefined;
        }

        console.log(
          `[DEBUG] mergeIdListWithDocList - Found document for ID: ${id.toString()}`,
        );

        // Get the document data (either from _doc or directly from the object)
        let docCopy;
        if (foundDoc._doc) {
          // Mongoose document
          docCopy = { ...foundDoc._doc };
          console.log(
            `[DEBUG] mergeIdListWithDocList - Document is a Mongoose document with _doc`,
          );
        } else {
          // Plain object
          docCopy = { ...foundDoc };
          console.log(
            `[DEBUG] mergeIdListWithDocList - Document is a plain object`,
          );
        }

        // Check for options
        if (docCopy.options) {
          console.log(
            `[DEBUG] mergeIdListWithDocList - Document has ${docCopy.options.length} options`,
          );
        } else {
          console.log(
            `[DEBUG] mergeIdListWithDocList - Document has no options`,
          );
        }

        // Remove specified fields if needed
        if (removeField && Array.isArray(removeField)) {
          removeField.forEach((field) => {
            if (field && docCopy) {
              delete docCopy[field];
              console.log(
                `[DEBUG] mergeIdListWithDocList - Removed field: ${field}`,
              );
            }
          });
        }

        return docCopy;
      })
      .filter((doc) => doc !== undefined); // Filter out undefined results

    console.log(
      `[DEBUG] mergeIdListWithDocList - Completed merge, final length: ${mergedDoc.length}`,
    );

    // Check the first merged doc for debugging
    if (mergedDoc.length > 0) {
      const firstDoc = mergedDoc[0];
      console.log(
        `[DEBUG] mergeIdListWithDocList - Sample merged doc ID: ${firstDoc._id.toString()}`,
      );
      console.log(
        `[DEBUG] mergeIdListWithDocList - Sample merged doc type: ${firstDoc.type}`,
      );
      if (firstDoc.options) {
        console.log(
          `[DEBUG] mergeIdListWithDocList - Sample merged doc has ${firstDoc.options.length} options`,
        );
      } else {
        console.log(
          `[DEBUG] mergeIdListWithDocList - Sample merged doc has no options`,
        );
      }
    }

    return mergedDoc;
  }

  stripHtml = (html: string): string => {
    if (!html) return '';

    // Simple regex-based HTML tag stripper for server-side use
    // Remove all HTML tags and decode basic HTML entities
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .trim();
  };

  fixQVOptionID(qsOptionList: QVOption[]) {
    qsOptionList.forEach((qsOption) => {
      qsOption.optionId = this.stripHtml(qsOption.optionName)
        .replace(/\s+/g, '_') // Replace all whitespace with underscores
        .replace(/[^\w_]/g, '') // Remove non-word characters except underscore
        .toLowerCase();
    });
    return qsOptionList;
  }
}
