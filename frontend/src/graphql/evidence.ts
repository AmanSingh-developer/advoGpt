import { gql } from "@apollo/client";

export const GET_EVIDENCES = gql`
  query GetEvidences {
    getEvidences {
      id
      name
      evidence_type
      category
      description
      tags
      notes
      chain_of_custody
      analysis
      created_at
      updated_at
    }
  }
`;

export const GET_EVIDENCE = gql`
  query GetEvidence($evidenceId: String!) {
    getEvidence(evidenceId: $evidenceId) {
      id
      name
      evidence_type
      category
      description
      tags
      notes
      chain_of_custody
      analysis
      created_at
      updated_at
    }
  }
`;

export const CREATE_EVIDENCE = gql`
  mutation CreateEvidence($input: CreateEvidenceInput!) {
    createEvidence(input: $input) {
      id
      name
      evidence_type
      category
      description
      tags
      notes
      chain_of_custody
      analysis
      created_at
      updated_at
    }
  }
`;

export const UPDATE_EVIDENCE = gql`
  mutation UpdateEvidence($input: UpdateEvidenceInput!) {
    updateEvidence(input: $input) {
      id
      name
      evidence_type
      category
      description
      tags
      notes
      chain_of_custody
      analysis
      created_at
      updated_at
    }
  }
`;

export const DELETE_EVIDENCE = gql`
  mutation DeleteEvidence($evidenceId: String!) {
    deleteEvidence(evidenceId: $evidenceId) {
      success
      message
    }
  }
`;
