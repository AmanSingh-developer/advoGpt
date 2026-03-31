import { gql } from "@apollo/client";

export const GET_COURT_PREPARATIONS = gql`
  query GetCourtPreparations {
    getCourtPreparations {
      id
      case_name
      court_type
      case_stage
      hearing_date
      opposing_party
      judge_name
      timeline_events
      examination_questions
      checklist_items
      legal_arguments
      created_at
      updated_at
    }
  }
`;

export const GET_COURT_PREPARATION = gql`
  query GetCourtPreparation($preparationId: String!) {
    getCourtPreparation(preparationId: $preparationId) {
      id
      case_name
      court_type
      case_stage
      hearing_date
      opposing_party
      judge_name
      timeline_events
      examination_questions
      checklist_items
      legal_arguments
      created_at
      updated_at
    }
  }
`;

export const CREATE_COURT_PREPARATION = gql`
  mutation CreateCourtPreparation($input: CreateCourtPreparationInput!) {
    createCourtPreparation(input: $input) {
      id
      case_name
      court_type
      case_stage
      hearing_date
      opposing_party
      judge_name
      timeline_events
      examination_questions
      checklist_items
      legal_arguments
      created_at
      updated_at
    }
  }
`;

export const UPDATE_COURT_PREPARATION = gql`
  mutation UpdateCourtPreparation($input: UpdateCourtPreparationInput!) {
    updateCourtPreparation(input: $input) {
      id
      case_name
      court_type
      case_stage
      hearing_date
      opposing_party
      judge_name
      timeline_events
      examination_questions
      checklist_items
      legal_arguments
      created_at
      updated_at
    }
  }
`;

export const DELETE_COURT_PREPARATION = gql`
  mutation DeleteCourtPreparation($preparationId: String!) {
    deleteCourtPreparation(preparationId: $preparationId) {
      success
      message
    }
  }
`;
