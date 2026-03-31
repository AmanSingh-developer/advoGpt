import { gql } from "@apollo/client";

export const GET_LEGAL_NOTICES = gql`
  query GetLegalNotices {
    getLegalNotices {
      id
      notice_type
      recipient_name
      recipient_address
      sender_name
      sender_address
      sender_email
      form_data
      generated_content
      created_at
      updated_at
    }
  }
`;

export const GET_LEGAL_NOTICE = gql`
  query GetLegalNotice($noticeId: String!) {
    getLegalNotice(noticeId: $noticeId) {
      id
      notice_type
      recipient_name
      recipient_address
      sender_name
      sender_address
      sender_email
      form_data
      generated_content
      created_at
      updated_at
    }
  }
`;

export const CREATE_LEGAL_NOTICE = gql`
  mutation CreateLegalNotice($input: CreateLegalNoticeInput!) {
    createLegalNotice(input: $input) {
      id
      notice_type
      recipient_name
      recipient_address
      sender_name
      sender_address
      sender_email
      form_data
      generated_content
      created_at
      updated_at
    }
  }
`;

export const UPDATE_LEGAL_NOTICE = gql`
  mutation UpdateLegalNotice($input: UpdateLegalNoticeInput!) {
    updateLegalNotice(input: $input) {
      id
      notice_type
      recipient_name
      recipient_address
      sender_name
      sender_address
      sender_email
      form_data
      generated_content
      created_at
      updated_at
    }
  }
`;

export const DELETE_LEGAL_NOTICE = gql`
  mutation DeleteLegalNotice($noticeId: String!) {
    deleteLegalNotice(noticeId: $noticeId) {
      success
      message
    }
  }
`;
