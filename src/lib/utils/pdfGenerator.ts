import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { DocumentAssessment, AssessmentQuestionResponse } from '@/lib/api/types';

export const generateAssessmentPDF = async (
  assessment: DocumentAssessment,
  responses: AssessmentQuestionResponse[],
  documentName: string,
  complianceScore: number,
  satisfactoryCount: number,
  unsatisfactoryCount: number,
  requirementCount: number,
  showNonRelevant: boolean = false
) => {
  // Dynamically import pdfmake to avoid build issues
  const pdfMake = (await import('pdfmake/build/pdfmake')).default;
  await import('pdfmake/build/vfs_fonts');
  const getVerdictColor = (verdict: string) => {
    switch (verdict?.toLowerCase()) {
      case 'satisfactory':
        return '#10b981'; // green
      case 'unsatisfactory':
        return '#ef4444'; // red
      case 'requirement':
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  };

  const getComplianceColor = (level: string) => {
    switch (level) {
      case 'compliant':
        return '#10b981';
      case 'partially_compliant':
        return '#f59e0b';
      case 'non_compliant':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  // Build the document definition
  const docDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [20, 30, 20, 30],
    defaultStyle: {
      fontSize: 10,
      lineHeight: 1.4
    },
    styles: {
      header: {
        fontSize: 24,
        bold: true,
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 18,
        bold: true,
        margin: [0, 20, 0, 10]
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 15, 0, 5]
      },
      metadata: {
        fontSize: 9,
        color: '#6b7280',
        margin: [0, 2, 0, 2]
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        fillColor: '#f3f4f6'
      }
    },
    content: [
      // Title
      {
        text: 'Building Safety AI Assessment Report',
        style: 'header'
      },
      {
        text: documentName,
        fontSize: 14,
        margin: [0, 0, 0, 20]
      },
      
      // Metadata
      {
        columns: [
          {
            width: '50%',
            stack: [
              { text: 'Assessment Details', style: 'sectionHeader' },
              { text: `Assessment ID: ${assessment.id}`, style: 'metadata' },
              { text: `Date: ${new Date(assessment.assessment_date).toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
              })}`, style: 'metadata' },
              { text: `Type: ${assessment.assessment_type}`, style: 'metadata' },
              { text: `Status: ${assessment.status}`, style: 'metadata' }
            ]
          },
          {
            width: '50%',
            stack: [
              { text: 'Compliance Summary', style: 'sectionHeader' },
              { text: `Overall Score: ${complianceScore}%`, fontSize: 16, bold: true, color: complianceScore >= 80 ? '#10b981' : complianceScore >= 60 ? '#f59e0b' : '#ef4444' },
              { text: `Satisfactory: ${satisfactoryCount}`, style: 'metadata', color: '#10b981' },
              { text: `Unsatisfactory: ${unsatisfactoryCount}`, style: 'metadata', color: '#ef4444' },
              { text: `Requirements: ${requirementCount}`, style: 'metadata', color: '#f59e0b' }
            ]
          }
        ]
      },
      
      // Summary Chart
      {
        margin: [0, 20, 0, 20],
        table: {
          widths: ['25%', '25%', '25%', '25%'],
          body: [
            [
              { text: 'Verdict Distribution', style: 'tableHeader', colSpan: 4, alignment: 'center' },
              {}, {}, {}
            ],
            [
              {
                stack: [
                  { text: satisfactoryCount.toString(), fontSize: 24, bold: true, alignment: 'center', color: '#10b981' },
                  { text: 'Satisfactory', alignment: 'center', fontSize: 9 }
                ]
              },
              {
                stack: [
                  { text: unsatisfactoryCount.toString(), fontSize: 24, bold: true, alignment: 'center', color: '#ef4444' },
                  { text: 'Unsatisfactory', alignment: 'center', fontSize: 9 }
                ]
              },
              {
                stack: [
                  { text: requirementCount.toString(), fontSize: 24, bold: true, alignment: 'center', color: '#f59e0b' },
                  { text: 'Requirements', alignment: 'center', fontSize: 9 }
                ]
              },
              {
                stack: [
                  { text: `${complianceScore}%`, fontSize: 24, bold: true, alignment: 'center' },
                  { text: 'Compliance', alignment: 'center', fontSize: 9 }
                ]
              }
            ]
          ]
        }
      },
      
      // Page break before detailed results
      { text: '', pageBreak: 'after' },
      
      // Detailed Assessment Results
      { text: 'Detailed Assessment Results', style: 'subheader' },
      
      // Results table
      {
        table: {
          headerRows: 1,
          widths: [30, '20%', '25%', '25%', '12%', '10%'],
          body: [
            // Header row
            [
              { text: '#', style: 'tableHeader', alignment: 'center' },
              { text: 'Question', style: 'tableHeader' },
              { text: 'AI Assessment', style: 'tableHeader' },
              { text: 'Recommendation', style: 'tableHeader' },
              { text: 'Verdict', style: 'tableHeader' },
              { text: 'Review', style: 'tableHeader' }
            ],
            // Data rows - filter based on showNonRelevant setting
            ...responses
              .filter(response => showNonRelevant ? true : response.is_relevant !== false)
              .map((response, index) => {
              const question = response.question || {};
              const verdictColor = getVerdictColor(response.verdict);
              const complianceColor = getComplianceColor(response.compliance_level);
              
              const consultantStatus = response.consultant_accepted === true ? 'Accepted' : 
                                     response.consultant_accepted === false ? 'Rejected' : 
                                     'Pending';
              const consultantColor = response.consultant_accepted === true ? '#10b981' : 
                                    response.consultant_accepted === false ? '#ef4444' : 
                                    '#f59e0b';
              
              return [
                { text: (index + 1).toString(), fontSize: 9, alignment: 'center' },
                {
                  stack: [
                    { text: question.original_text || 'N/A', fontSize: 9, bold: true },
                    question.ref ? { text: `Ref: ${question.ref}`, fontSize: 8, color: '#6b7280' } : {}
                  ]
                },
                {
                  stack: [
                    { text: response.comment || 'No comment', fontSize: 9 },
                    response.evidence_reference ? { text: `Evidence: ${response.evidence_reference}`, fontSize: 8, color: '#6b7280', margin: [0, 2, 0, 0] } : {}
                  ]
                },
                {
                  text: response.improvement_recommendation || 'No recommendation',
                  fontSize: 9
                },
                {
                  stack: [
                    { text: response.verdict || 'N/A', fontSize: 9, bold: true, color: verdictColor },
                    { text: response.compliance_level?.replace(/_/g, ' ') || '', fontSize: 8, color: complianceColor }
                  ]
                },
                {
                  text: consultantStatus,
                  fontSize: 9,
                  bold: true,
                  color: consultantColor,
                  alignment: 'center'
                }
              ];
            })
          ]
        },
        layout: {
          hLineWidth: (i: number) => i === 0 || i === 1 ? 1 : 0.5,
          vLineWidth: () => 0,
          hLineColor: () => '#e5e7eb',
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6
        }
      },
      
      // Footer
      {
        margin: [0, 40, 0, 0],
        stack: [
          { text: 'Generated by BuildingSafetyAI', alignment: 'center', fontSize: 9, color: '#6b7280' },
          { 
            text: `Report generated on ${new Date().toLocaleDateString('en-GB', { 
              day: 'numeric', 
              month: 'long', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}`, 
            alignment: 'center', 
            fontSize: 9, 
            color: '#6b7280' 
          }
        ]
      }
    ]
  };

  // Generate and download the PDF
  pdfMake.createPdf(docDefinition).download(`${documentName.replace(/\.[^/.]+$/, '')}_assessment_${new Date().toISOString().split('T')[0]}.pdf`);
};