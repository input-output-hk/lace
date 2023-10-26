import React from 'react';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import styles from './SettingsLayout.module.scss';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Title, Subtitle, Paragraph } from './utils/DrawerUtils';

const { Title: AntdTitle } = Typography;

// TODO: add translation once the final text was delivered by legals https://input-output.atlassian.net/browse/LW-5297

interface GeneralSettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
}

export const PrivacyPolicyDrawer = ({
  visible,
  onClose,
  popupView = false
}: GeneralSettingsDrawerProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={<DrawerHeader popupView={popupView} title={t('browserView.settings.legal.privacyPolicy.title')} />}
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={!popupView ? onClose : undefined}
          onArrowIconClick={popupView ? onClose : undefined}
        />
      }
      popupView={popupView}
    >
      <div data-testid="privacy-policy-content" className={popupView ? styles.popupContainer : styles.drawerContainer}>
        <AntdTitle
          level={5}
          className={`${popupView ? 'mt-1 mb-3' : 'mt-5 mb-2'} font-weight-600 line-height-3 font-body-large`}
        >
          Last updated September 6, 2023
        </AntdTitle>
        <Paragraph>
          Thank you for choosing to be part of our community at Input Output Global, Inc., (together with our
          subsidiaries and affiliates, "<strong>IOG</strong>", "<strong>we</strong>", "<strong>us</strong>", or "
          <strong>our</strong>"). This Privacy Policy applies to all personal information collected through this website
          and all of IOG’s related websites, mobile apps, products, services, sales, marketing or events, including our
          plug-ins and browser extensions (collectively, the "<strong>Products</strong>").
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          We are committed to protecting your personal information. When you access or use our Products, you trust us
          with your personal information. In this Privacy Policy, we describe how we collect, use, store and share your
          personal information and what rights you have in relation to it. If there are any terms in this Privacy Policy
          that you do not agree with, please discontinue access and use of our Products.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          Please read this Privacy Policy carefully as it will help you make informed decisions about sharing your
          personal information with us.
        </Paragraph>
        <br />
        <br />
        <Title>1. Collection of Data</Title>
        <Paragraph>
          IOG collects several types of information for various purposes to provide and improve the Products for your
          use.
        </Paragraph>
        <br />
        <br />
        <Title>Types of Data Collected</Title>
        <ul>
          <li>
            <Subtitle semiBold>Personal Data</Subtitle>
            <div>
              <Paragraph>
                While using the Products, IOG may ask you to provide certain personally identifiable information that
                can be used to contact or identify you ("<strong>Personal Data</strong>"), which may include, but is not
                limited to:
              </Paragraph>
              <br />
              <br />
              <ul>
                <li className={styles.settingsText}>Email address</li>
                <li className={styles.settingsText}>First name and last name</li>
                <li className={styles.settingsText}>Phone number</li>
                <li className={styles.settingsText}>Address, State, Province, ZIP/Postal code, City</li>
                <li className={styles.settingsText}>Cookies and Usage Data</li>
              </ul>
              <br />

              <Paragraph>
                Your Personal Data may be used to contact you with newsletters, marketing or promotional materials and
                other information that may be of interest to you. You may opt out of receiving any, or all, of these
                communications by following the unsubscribe link or instructions provided in any email sent to you by
                IOG.
              </Paragraph>
            </div>
          </li>
          <br />
          <li>
            <Subtitle semiBold>Usage Information</Subtitle>
            <Paragraph>
              Usage Information refers to information collected from Products such as what action has been applied to
              Products such as clicking logs; your registration details or how you may be using Products.
            </Paragraph>
          </li>
          <br />
          <li>
            <Subtitle semiBold>IP Address</Subtitle>
            <Paragraph>
              When you use Products, we may automatically log your IP address (the unique address which identifies your
              computer on the internet) which is automatically recognized by our server.
            </Paragraph>
          </li>
        </ul>
        <br />

        <Title>2. Use of Data</Title>
        <Paragraph>
          Specifically, IOG uses your information for the purpose for which you provided it to us such as:
        </Paragraph>

        <ul>
          <li className={styles.settingsText}>To notify you about changes to Products</li>
          <li className={styles.settingsText}>
            To allow you to participate in interactive features of Products when you choose to do so
          </li>
          <li className={styles.settingsText}>To provide customer support</li>
          <li className={styles.settingsText}>
            To gather analysis or valuable information so that we can improve the website
          </li>
          <li className={styles.settingsText}>To monitor the usage of Products</li>
          <li className={styles.settingsText}>To detect, prevent and address technical issues</li>
          <li className={styles.settingsText}>
            To provide you with news, special offers and general information about other goods, services and events
            which IOG offers that are similar to those that you have already purchased or enquired about unless you have
            opted not to receive such information
          </li>
        </ul>
        <br />
        <Paragraph>
          Where and as permitted under applicable law, IOG may process your contact information for direct marketing
          purposes (e.g., event invitations, newsletters) and to carry out customer satisfaction surveys, in each case
          also by email. You may object to the processing of your contact data for these purposes at any time by writing
          to legal@iohk.io or by using the opt-out mechanism provided in the respective communication you received.
        </Paragraph>
        <br />
        <br />

        <Title>3. Legal Basis under General Data Protection Regulation (GDPR)</Title>
        <Paragraph>
          For a citizen or resident of a member country of the European Union (EU) or the European Economic Area (EEA),
          the legal basis for collecting and using Personal Data described in this Privacy Policy depends on the
          Personal Data being collected and the specific context in which it is collected as described below:
        </Paragraph>
        <br />
        <br />
        <Paragraph>IOG may process your Personal Data because:</Paragraph>

        <ul>
          <li className={styles.settingsText}>IOG needs to perform a contract with you</li>
          <li className={styles.settingsText}>You have given us permission to do so</li>
          <li className={styles.settingsText}>The processing derives from IOG's legitimate interests</li>
          <li className={styles.settingsText}>IOG has to comply with applicable law</li>
        </ul>

        <Paragraph>
          The legal basis for IOG processing data about you is that it is necessary for the purposes of:
        </Paragraph>

        <ul>
          <li className={styles.settingsText}>
            IOG exercising its rights and performing its obligations in connection with any contract we make with you
            (Article 6 (1) (b) General Data Protection Regulation),
          </li>
          <li className={styles.settingsText}>
            Compliance with IOG’s legal obligations (Article 6 (1) (c) General Data Protection Regulation), and/or
          </li>
          <li className={styles.settingsText}>
            Legitimate interests pursued by IOG (Article 6 (1) (f) General Data Protection Regulation).
          </li>
        </ul>

        <Paragraph>
          Generally the legitimate interest pursued by IOG in relation to our use of your personal data is the efficient
          performance or management of our business relationship with you.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          In some cases, we may ask if you consent to the relevant use of your personal data. In such cases, the legal
          basis for IOG processing that data about you may (in addition or instead) be that you have consented (Article
          6 (1) (a) General Data Protection Regulation).
        </Paragraph>
        <br />
        <br />

        <Title>4. Retention of Data</Title>
        <Paragraph>
          IOG will retain your Personal Data only for as long as is necessary for the purposes set out in this Privacy
          Policy. IOG will retain and use your Personal Data to the extent necessary to comply with our legal
          obligations (for example, if IOG is required to retain your Personal Data to comply with applicable laws),
          resolve disputes, and enforce legal agreements and policies.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          IOG will also retain Usage Data for internal analysis purposes. Usage Data is generally retained for a shorter
          period of time, except when this data is used to strengthen the security or to improve the functionality of
          Products, or IOG is legally obligated to retain such data for longer time periods.
        </Paragraph>
        <br />
        <br />

        <Title>5. Transfer Of Data</Title>
        <Paragraph>
          Your information, including Personal Data, may be transferred to — and maintained on — computers located
          outside of your state, province, country or other governmental jurisdiction where the data protection laws may
          differ from those from your jurisdiction.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          Your use of Products under the IOG Terms of Use followed by your submission of your personal information
          constitutes your unreserved agreement to this Privacy Policy in general and the transfer of data under this
          policy in particular.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          IOG will take all steps reasonably necessary to ensure that your data is treated securely and in accordance
          with this Privacy Policy and no transfer of your Personal Data will take place to an organization or a country
          unless there are adequate controls in place including the security of your data and other personal
          information.
        </Paragraph>
        <br />
        <br />

        <Title>6. Disclosure Of Data</Title>
        <Subtitle semiBold>Legal Requirements</Subtitle>
        <br />
        <Paragraph>
          IOG may disclose your Personal Data in good faith belief that such disclosure is necessary to:
        </Paragraph>
        <ul>
          <li className={styles.settingsText}>To comply with a legal obligation</li>
          <li className={styles.settingsText}>To protect and defend the rights or property of IOG</li>
          <li className={styles.settingsText}>
            To prevent or investigate possible wrongdoing in connection with Products
          </li>
          <li className={styles.settingsText}>To protect the personal safety of users of Products or the public</li>
          <li className={styles.settingsText}>To protect against legal liability</li>
        </ul>
        <br />
        <Subtitle semiBold>Disclosure of Personal Information Within The EU</Subtitle>
        <Paragraph>
          Insofar as we employ the services of service providers to implement or fulfill any tasks on our behalf the
          contractual relations will be regulated in writing according to the provisions of the European General Data
          Protection Regulation (EU-GDPR) and the Federal Data Protection Act (new BDSG).
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Disclosure of Personal Information Outside of The EU</Subtitle>
        <Paragraph>
          Insofar as you have selected and consented to this in the form, your data will be disclosed to our offices
          within the network of affiliated companies outside of the European economic area for the processing of your
          enquiry. These offices are legally obligated to abide by the EU-GDPR. Furthermore, between the legally
          autonomous companies in the network of affiliated companies written agreements exist for the processing of
          data on commission, based on standardized contract stipulations.
        </Paragraph>
        <br />
        <br />
        <Title>7. Security Of Data</Title>
        <Paragraph>
          We use reasonable technical and organizational methods to safeguard your information, for example, by password
          protecting (via usernames and passwords unique to you) certain parts of the Products and by using SSL
          encryption and firewalls to protect against unauthorized access, disclosure, alteration or destruction.
          However, please note that this is not a guarantee that such information may not be accessed, disclosed,
          altered or destroyed by breach of such firewalls and secure server software.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          Whilst we will use all reasonable efforts to safeguard your information, you acknowledge that data
          transmissions over the internet cannot be guaranteed to be 100% secure and for this reason we cannot guarantee
          the security or integrity of any Personal Information that is transferred from you or to you via the internet
          and as such, any information you transfer to IOG is done at your own risk.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          Where we have given you (or where you have chosen) a password which enables you to access certain parts of our
          site, you are responsible for keeping this password confidential. We ask you not to share a password with
          anyone.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          If we learn of a security systems breach we may attempt to notify you electronically so that you can take
          appropriate protective steps. By using Products or providing Personal Information to us you agree that we can
          communicate with you electronically regarding security, privacy and administrative issues relating to your use
          of Products. We may post a notice on Products if a security breach occurs. We may also send an email to you at
          the email address you have provided to us in these circumstances. Depending on where you live, you may have a
          legal right to receive notice of a security breach in writing.
        </Paragraph>
        <br />
        <br />

        <Title>8. Rights Under General Data Protection Regulation (GDPR)</Title>
        <Paragraph>
          If you are a citizen or resident of a member country of the European Union (EU) or the European Economic Area
          (EEA), you have certain data protection rights. IOG aims to take reasonable steps to allow you to correct,
          amend, delete, or limit the use of your Personal Data.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          If you wish to be informed what Personal Data IOG holds about you and if you want it to be removed from our
          systems, please contact us legal@iohk.io
        </Paragraph>

        <br />
        <br />
        <Paragraph>In certain circumstances, you have the following data protection rights:</Paragraph>

        <ul>
          <li className={styles.settingsText}>
            <strong>The right to access.</strong> You have the right to request information concerning the personal
            information we hold that relates to you.
          </li>
          <li className={styles.settingsText}>
            <strong>The right of rectification.</strong> You have the right to have your information rectified if that
            information is inaccurate or incomplete.
          </li>
          <li className={styles.settingsText}>
            <strong>The right to object.</strong> You have the right to object to your personal information being used
            for a particular purpose and you can exercise these rights, for example, via an unsubscribe link at the
            bottom of any email.
          </li>
          <li className={styles.settingsText}>
            <strong>The right of restriction.</strong> You have the right to request that IOG restricts the processing
            of your personal information.
          </li>
          <li className={styles.settingsText}>
            <strong>The right to data portability.</strong> You have the right to be provided with a copy of the
            information IOG has on you in a structured, machine-readable and commonly used format.
          </li>
          <li className={styles.settingsText}>
            <strong>The right to withdraw consent.</strong> You also have the right to withdraw your consent at any time
            where IOG relied on your consent to process your personal information.
          </li>
        </ul>

        <Paragraph>
          Please note that IOG may ask you to verify your identity before responding to such requests.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          You have the right to complain to a Data Protection Authority about our collection and use of your Personal
          Data. For more information, please contact your local data protection authority in the EU or EEA.
        </Paragraph>
        <br />
        <br />
        <Title>9. California Residents</Title>
        <Paragraph>
          <strong>
            If you are a California resident, you have certain rights with respect to your personal information pursuant
            to the California Consumer Privacy Act of 2018 (“CCPA”). This section applies to you.
          </strong>
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          <strong>
            We are required to inform you of: (i) what categories of information we collect about you, including during
            the preceding 12 months, (ii) the purposes for which we use your personal data, including during the
            preceding 12 months, and (iii) the purposes for which we share your personal data, including during the
            preceding 12 months.
          </strong>
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          You have the right to: (i) request a copy of the personal information that we have about you; (ii) request
          that we delete your personal information; and (iii) opt-out of the sale of your personal information. You can
          limit the use of tracking technologies, such as cookies, by following instructions in the “Your choices”
          section. These rights are subject to limitations as described in the CCPA.
        </Paragraph>
        <br />
        <br />
        <Paragraph>We will not discriminate against any consumer for exercising their CCPA rights.</Paragraph>
        <br />
        <br />
        <Paragraph>If you would like to exercise any of these rights, please contact us at legal@iohk.io.</Paragraph>
        <br />
        <br />
        <Title>10. Service Providers, Plugins and Tools</Title>
        <Paragraph>
          IOG may employ third party companies and individuals to facilitate Products, to provide the Products on our
          behalf, to perform website-related services or to assist us in analyzing how the Products are used (
          <strong>"Service Providers"</strong>).
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          These Service Providers have access to your Personal Data only to perform these tasks on our behalf and are
          obligated not to disclose or use it for any other purpose.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Social Media</Subtitle>
        <Paragraph>
          IOG may use social media plugins to enable a better user experience with the use of Products.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Youtube</Subtitle>
        <Paragraph>
          IOG uses the YouTube video platform operated by YouTube LLC, 901 Cherry Ave. San Bruno, CA 94066 USA. YouTube
          is a platform that enables playback of audio and video files. If you visit one of our pages featuring a
          YouTube plugin, a connection to the YouTube servers is established. Here the YouTube server is informed about
          which of our pages you have visited. If you’re logged in to your YouTube account, YouTube allows you to
          associate your browsing behavior directly with your personal profile. You can prevent this by logging out of
          your YouTube account. YouTube is used to help make our website appealing. For information about the scope and
          purpose of data collection, the further processing and use of the data by YouTube and your rights and the
          settings you can configure to protect your privacy, please refer to the YouTube Privacy Guidelines.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Analytics</Subtitle>
        <Paragraph>
          IOG may use Service Providers to monitor and analyze the use of Products such as Matomo and/or PostHog.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Newsletter</Subtitle>
        <Paragraph>
          If you would like to receive our newsletter, we require a valid email address as well as information that
          allows us to verify that you are the owner of the specified email address and that you agree to receive this
          newsletter. No additional data is collected or is only collected on a voluntary basis. We only use this data
          to send the requested information and do not pass it on to third parties. We will, therefore, process any data
          you enter onto the contact form only with your consent per (Article 6 (1) (a) General Data Protection
          Regulation). You can revoke consent to the storage and use of your data and email address for sending the
          newsletter at any time, e.g., through the "unsubscribe" link in the newsletter. The data processed before we
          receive your request may still be legally processed. The data provided when registering for the newsletter
          will be used to distribute the newsletter until you cancel your subscription when said data will be deleted.
          Data we have stored for other purposes (e.g., email addresses for members areas) remain unaffected.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Newsletter Tracking</Subtitle>
        <Paragraph>
          Newsletter tracking (also referred to as Web beacons or tracking pixels) is used if users have given their
          explicit prior consent. When the newsletter is dispatched, the external server can then record certain data
          related to the recipient, such as the time and date the newsletter is retrieved, the IP address or details
          regarding the email program (client) used. The name of the image file is personalized for every email
          recipient by a unique ID being appended to it. The sender of the email notes which ID belongs to which email
          address and is thus able to determine which newsletter recipient has just opened the email when the image is
          called.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          You may revoke your consent at any time by unsubscribing to the newsletter. This can be done by sending an
          email request to unsubscribe to dataprotection@iohk.io. You may also remove yourself from the mailing list
          using the unsubscribe link in the newsletter.
        </Paragraph>
        <br />
        <br />
        <Title>11. Links To Other Products</Title>
        <Paragraph>
          Products may contain links to other products that are not operated by IOG. If you click on a third-party link,
          you will be directed to that third party's site. You’re advised to review the privacy policy of each non-IOG
          site you decide to visit.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          IOG has no control over and assumes no responsibility for the content, privacy policies or practices of any
          third-party product or service.
        </Paragraph>
        <br />
        <br />
        <Title>12. Changes To This Privacy Policy</Title>
        <Paragraph>
          IOG may update this Privacy Policy from time to time. Such changes will be posted on this page. The effective
          date of such changes will be notified via email and/or a prominent notice on the Product, with an update the
          "effective date" at the top of this Privacy Policy.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are
          effective when they are posted on this page.
        </Paragraph>
        <br />
        <br />
        <Title>13. Data Privacy Contact</Title>
        <Paragraph>You can reach our data protection officer at dataprotection@iohk.io</Paragraph>
        <br />
        <br />
        <Title>14. Contact by E-mail or Contact Form</Title>

        <Paragraph>
          When you contact us by e-mail or through a contact form, we store the data you provide (your email address,
          possibly your name and telephone number) so we can answer your questions. Insofar as we use our contact form
          to request entries that are not required for contacting you, we have marked these as optional. This
          information serves to substantiate your inquiry and improve the handling of your request. Your message may be
          linked to various actions taken by you on the IOG website. Information collected will be solely used to
          provide you with support relating to your inquiry and better understand your feedback. A statement of this
          information is expressly provided on a voluntary basis and with your consent. As far as this concerns
          information about communication channels (such as e-mail address or telephone number), you also agree that we
          may, where appropriate, contact you via this communication channel to answer your request. You may of course
          revoke this consent for the future at any time.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          We delete the data that arises in this context after saving is no longer required, or limit processing if
          there are statutory retention requirements.
        </Paragraph>
      </div>
    </Drawer>
  );
};
