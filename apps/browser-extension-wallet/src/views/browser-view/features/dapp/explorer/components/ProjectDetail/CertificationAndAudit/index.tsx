import * as React from 'react';
import { Collapse } from 'antd';
import { IogText, IogTitle } from '../../Typography';
import { ISectionCardItem } from '../../../services/helpers/apis-formatter/types';
import { useDrawer } from '../drawer';
import { AuditHeader } from '../AuditHeader';
import { IogRow } from '../../Grid';
import { IogButton } from '../../Button';
import { getCompletionDate, handleDownloadCertificate } from './helpers';

import './styles.scss';
import { CERTIFICATION_AUDIT_DOWNLOAD_CERTIFICATION_TEST_ID } from './constants';

const { Panel } = Collapse;

export const CertificationAndAudit = () => {
  const {
    state: { data }
  } = useDrawer<ISectionCardItem>();

  return (
    <>
      <IogTitle as="h3" xMedium data-testid="audit-title">
        Audit and Certification history
      </IogTitle>

      <Collapse
        className="iog-accordion iog-accordion__audit"
        defaultActiveKey={['0']}
        expandIconPosition="right"
        ghost
      >
        {data?.certificates?.map((certificate, index) => (
          <Panel
            header={
              <AuditHeader
                title={`${certificate?.certification.name}`}
                subtitle={`Audit completion date ${getCompletionDate(certificate?.issuedAt)}`}
                image={{ src: certificate?.certification?.icon?.src, alt: certificate?.certification?.name }}
              />
            }
            key={index}
            className="site-collapse-custom-panel"
          >
            {certificate?.summary}

            {certificate?.pdfLink && (
              <IogRow style={{ justifyContent: 'space-between', alignItems: 'center' }} spacer={40}>
                <IogText xMedium bold color="black">
                  View full report
                </IogText>
                <IogButton
                  data-testid={CERTIFICATION_AUDIT_DOWNLOAD_CERTIFICATION_TEST_ID}
                  standard
                  secondary
                  onClick={() => handleDownloadCertificate(certificate.pdfLink, certificate.certification.name)}
                >
                  Download Pdf
                </IogButton>
              </IogRow>
            )}
          </Panel>
        ))}
      </Collapse>
    </>
  );
};
