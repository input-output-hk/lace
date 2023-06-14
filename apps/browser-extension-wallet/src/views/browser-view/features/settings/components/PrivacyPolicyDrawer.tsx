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
      visible={visible}
      onClose={onClose}
      title={<DrawerHeader popupView={popupView} title={t('browserView.settings.legal.privacyPolicy.title')} />}
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={popupView ? undefined : onClose}
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
          Last updated March 30, 2022
        </AntdTitle>
        <Paragraph>
          Thank you for choosing to be part of our community at Input Output Global, Inc., (together with our
          subsidiaries and affiliates, "<strong>IOG</strong>", "<strong>we</strong>", "<strong>us</strong>", or "
          <strong>our</strong>"). This Privacy Policy applies to all personal information collected through this website
          and all of IOG's related websites, mobile apps, products, services, sales, marketing or events, including our
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
          IOG collects several different types of information for various purposes in order to provide and improve the
          Product for your use.
        </Paragraph>
        <br />
        <br />
        <Title>Types of Data Collected</Title>
        <ul>
          <li>
            <Subtitle semiBold>Personal Data</Subtitle>
            <div>
              <Paragraph>
                While using the Product, IOG may ask you to provide certain personally identifiable information that can
                be used to contact or identify you ("Personal Data"), which may include, but is not limited to:
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
              Usage Information refers to all information collected from the Product such as what action has been
              applied to the Product such as clicking logs; your registration details or how you may be using the
              Product.
            </Paragraph>
          </li>
          <br />
          <li>
            <Subtitle semiBold>IP Address</Subtitle>
            <Paragraph>
              When you use the Product, we may automatically log your IP address (the unique address which identifies
              your computer on the internet) which is automatically recognized by our server.
            </Paragraph>
          </li>
        </ul>
        <br />

        <Title>2. Use of Data</Title>
        <Paragraph>
          Specifically IOG uses your information for the purpose for which you provided it to us such as:
        </Paragraph>

        <ul>
          <li className={styles.settingsText}>To notify you about changes to this Product </li>
          <li className={styles.settingsText}>
            To allow you to participate in interactive features of this Product when you choose to do so
          </li>
          <li className={styles.settingsText}>To provide customer support</li>
          <li className={styles.settingsText}>
            To gather analysis or valuable information so that we can improve the website
          </li>
          <li className={styles.settingsText}>To monitor the usage of this Product</li>
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
          purposes (e.g. show invitations, newsletters) and to carry out customer satisfaction surveys, in each case
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

        <Paragraph>OG may process your Personal Data because:</Paragraph>

        <ul>
          <li className={styles.settingsText}>IOG needs to perform a contract with you</li>
          <li className={styles.settingsText}>You have given us permission to do so</li>
          <li className={styles.settingsText}>The processing derives from IOG's legitimate interests</li>
          <li className={styles.settingsText}>IOG has to comply with applicable law</li>
        </ul>

        <Paragraph>
          The legal basis for IOG processing data about you is that such processing is necessary for the purposes of:
        </Paragraph>

        <ul>
          <li className={styles.settingsText}>
            IOG exercising its rights and performing its obligations in connection with any contract we make with you
            (Article 6 (1) (b) General Data Protection Regulation),
          </li>
          <li className={styles.settingsText}>
            Compliance with IOG's legal obligations (Article 6 (1) (c) General Data Protection Regulation), and/or
          </li>
          <li className={styles.settingsText}>
            Legitimate interests pursued by IOG (Article 6 (1) (f) General Data Protection Regulation).
          </li>
        </ul>

        <Paragraph>
          Generally the legitimate interest pursued by IOG in relation to our use of your personal data is the efficient
          performance or management of our business relationship with you.
        </Paragraph>
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
          the Product, or IOG is legally obligated to retain such data for longer time periods.
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
          Your use of the Product under the IOG Terms of Use followed by your submission of your personal information
          constitutes your unreserved agreement to this Privacy Policy in general and the transfer of data under this
          policy in particular
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
            To prevent or investigate possible wrongdoing in connection with the Product
          </li>
          <li className={styles.settingsText}>To protect the personal safety of users of the Product or the public</li>
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
          data on commission, based on standard EU contract stipulations.
        </Paragraph>
        <br />
        <br />
        <Title>7. Security Of Data</Title>
        <Paragraph>
          We use reasonable technical and organizational methods to safeguard your information, for example, by password
          protecting (via usernames and passwords unique to you) certain parts of the Product and by using SSL
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
          appropriate protective steps. By using this Product or providing Personal Information to us you agree that we
          can communicate with you electronically regarding security, privacy and administrative issues relating to your
          use of this Product. We may post a notice on our Product if a security breach occurs. We may also send an
          email to you at the email address you have provided to us in these circumstances. Depending on where you live,
          you may have a legal right to receive notice of a security breach in writing.
        </Paragraph>
        <br />
        <br />

        <Title>8. Rights Under General Data Protection Regulation (GDPR)</Title>
        <Paragraph>removed from our systems, please contact us legal@iohk.io</Paragraph>
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
          Please note that IOG may ask you to verify your identity before responding to such requests
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
            to the California Consumer Privacy Act of 2018 ("CCPA"). This section applies to you.
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
        <Paragraph>We will not discriminate against any consumer for exercising their CCPA rights.</Paragraph>
        <br />
        <br />
        <Paragraph>If you would like to exercise any of these rights, please contact us at legal@iohk.io.</Paragraph>
        <br />
        <br />
        <Title>10. Service Providers, Plugins and Tools</Title>
        <Paragraph>
          IOG may employ third party companies and individuals to facilitate the Product, to provide the Product on our
          behalf, to perform website-related services or to assist us in analyzing how the Product is used ("
          <strong>Service Providers</strong>").
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
          IOG may use social media plugins to enable a better user experience with the use of the Product
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Youtube</Subtitle>
        <Paragraph>
          IOG uses the YouTube video platform operated by YouTube LLC, 901 Cherry Ave. San Bruno, CA 94066 USA. YouTube
          is a platform that enables playback of audio and video files. If you visit one of our pages featuring a
          YouTube plugin, a connection to the YouTube servers is established. Here the YouTube server is informed about
          which of our pages you have visited. If you're logged in to your YouTube account, YouTube allows you to
          associate your browsing behavior directly with your personal profile. You can prevent this by logging out of
          your YouTube account. YouTube is used to help make our website appealing. For information about the scope and
          purpose of data collection, the further processing and use of the data by YouTube and your rights and the
          setting
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Analytics</Subtitle>
        <Paragraph>IOG may use Service Providers to monitor and analyze the use of the Product.</Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Google Analytics</Subtitle>
        <Paragraph>
          IOG uses Google Analytics, a web analytics service. It is operated by Google Inc., 1600 Amphitheatre Parkway,
          Mountain View, CA 94043, USA. Google Analytics uses so-called "cookies". These are text files that are stored
          on your computer and that allow an analysis of the use of the website by you. The information generated by the
          cookie about your use of this website is usually transmitted to a Google server in the USA and stored there.
          Google Analytics cookies are stored based on Art. 6 (1) (f) DSGVO. The website operator has a legitimate
          interest in analyzing user behavior to optimize both its website and its advertising. If you would like to
          opt-out of Google Analytics monitoring your behavior on the Product, please use this link:
          https://tools.google.com/dlpage/gaoptout/.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Browser Plugin</Subtitle>
        <Paragraph>
          You can prevent these cookies being stored by selecting the appropriate settings in your browser. However, we
          wish to point out that doing so may mean you will not be able to enjoy the full functionality of this website.
          You can also prevent the data generated by cookies about your use of the website (incl. your IP address) from
          being passed to Google, and the processing of these data by Google, by downloading and installing the browser
          plugin available at the following link: tools.google.com/dlpage/gaoptout.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Object to the Collection of Data</Subtitle>
        <Paragraph>
          You can prevent the collection of your data by Google Analytics by clicking on the following link. An opt-out
          cookie will be set to prevent your data from being collected on future visits to this site: Disable Google
          Analytics. For more information about how Google Analytics handles user data, see Google's privacy policy:
          support.google.com/analytics/answer/6004245.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Outsourced Data Processing</Subtitle>
        <Paragraph>
          We have entered into an agreement with Google for the outsourcing of our data processing and fully implement
          the strict requirements of the German data protection authorities when using Google Analytics.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Demographic Data Collection by Google Analytics</Subtitle>
        <Paragraph>
          This website uses Google Analytics' demographic features. This allows reports to be generated containing
          statements about the age, gender, and interests of site visitors. This data comes from interest-based
          advertising from Google and third-party visitor data. This collected data cannot be attributed to any specific
          individual person. You can disable this feature at any time by adjusting the ads settings in your Google
          account or you can forbid the collection of your data by Google Analytics as described in the section "Refusal
          of data collection".
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Google Tag Manager</Subtitle>
        <Paragraph>
          This website uses Google Tag Manager. This service allows website tags to be managed via an interface. Google
          Tag Manager only implements tags. This means that no cookies are set and no personal data is recorded. Google
          Tag Manager triggers other tags which, in turn, may record data. However, Google Tag Manager does not access
          this data. If tags have been disabled at the domain or cookie level, this remains in place for all tracking
          tags if these are implemented with Google Tag Manager. You can find out more about Google Tag Manager by
          clicking the following link: http://www.google.de/tagmanager/use-policy.html.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Advertising</Subtitle>
        <Paragraph>IOG may use an online marketing tool to display adverts on the Product.</Paragraph>
        <br />
        <br />
        <Subtitle semiBold>DoubleClick by Google</Subtitle>
        <Paragraph>
          This website also uses the online marketing tool DoubleClick by Google. DoubleClick uses cookies to serve ads
          that are relevant to users, to improve campaign performance reports, or to prevent a user from seeing the same
          ads multiple times. Google uses a cookie ID to determine which ads are running in which browser and can
          prevent them from being displayed multiple times. In addition, DoubleClick uses cookie IDs to track
          conversions related to ad requests. For example, if a user sees a DoubleClick ad and later goes to the
          advertiser's website with the same browser and buys something there. According to Google, DoubleClick cookies
          do not contain personally identifiable information.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          Due to the marketing tools used, your browser automatically establishes a direct connection to the Google
          server. We have no control over the extent and further use of the data collected by the use of this tool by
          Google and therefore inform you to the best of our knowledge: By including DoubleClick, Google receives the
          information that you access the corresponding part of our website or clicked an ad from us. If you are
          registered with a service provided by Google, Google may associate the visit with your account. Even if you
          are not registered with Google or have not logged in, there is a chance that the provider will find and store
          your IP address.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          You can prevent participation in this tracking process in several ways: a) by adjusting your browser software
          accordingly, in particular, the suppression of third-party cookies will prevent you from receiving any third
          party advertisements; b) by disabling the cookies for conversion tracking by setting your browser to block
          cookies from the domain "www.googleadservices.com", https://www.google.com/settings/ads, this setting is
          deleted when you delete your cookies; c) by deactivating the interest-based advertisements of the providers
          that are part of the "About Ads" self-regulation campaign via the link http://www.aboutads.info/choices, this
          setting being deleted when you delete your cookies; d) by permanent deactivation in your browsers Firefox,
          Internet Explorer or Google Chrome under the link http://www.google.com/settings/ads/plugin. We point out that
          in this case you may not be able to use all the features of this offer in full.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          The legal basis for the processing of your data is Art. 6 (1) sentence 1 lit. f DS-GMO. To learn more about
          DoubleClick by Google, visit https://www.google.com/doubleclick and
          http://support.google.com/adsense/answer/283909 0, and Google's privacy policy in general:
          https://www.google.com/intl/en/policies/ privacy. Alternatively, you can visit the Network Advertising
          Initiative (NAI) web site at http://www.networkadvertising.org. Google has submitted to the EU-US Privacy
          Shield, https://www.privacyshield.gov/EU-US Framework
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Google Maps</Subtitle>
        <Paragraph>
          This website uses Google Maps API in order to present geographical information visually. When using Google
          Maps, data on the use of Maps features by visitors of the website is also gathered, processed and used by
          Google. More detailed information on Google's data processing can be found in Google's data protection policy.
          You can change your settings in the data protection center so that you can manage and safeguard your data.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Web Fonts</Subtitle>
        <Paragraph>IOG may use online web fonts to display texts and fonts on the Product.</Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Google Web Fonts</Subtitle>
        <Paragraph>
          For uniform representation of fonts, this page uses web fonts provided by Google. When you open a page, your
          browser loads the required web fonts into your browser cache to display texts and fonts correctly.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          For this purpose your browser has to establish a direct connection to Google servers. Google thus becomes
          aware that our web page was accessed via your IP address. The use of Google Web fonts is done in the interest
          of a uniform and attractive presentation of our website. This constitutes a justified interest pursuant to
          Art. 6 (1) (f) DSGVO.
        </Paragraph>
        <br />
        <br />
        <Paragraph>If your browser does not support web fonts, a standard font is used by your computer.</Paragraph>
        <br />
        <br />
        <Paragraph>
          Further information about handling user data, can be found at https://developers.google.com/fonts/faq and in
          Google's privacy policy at https://www.google.com/policies/privacy/.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Newsletter</Subtitle>
        <Paragraph>
          If you would like to receive our newsletter, we require a valid email address as well as information that
          allows us to verify that you are the owner of the specified email address and that you agree to receive this
          newsletter. No additional data is collected or is only collected on a voluntary basis. We only use this data
          to send the requested information and do not pass it on to third parties.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          We will, therefore, process any data you enter onto the contact form only with your consent per Art. 6 (1) (a)
          DSGVO. You can revoke consent to the storage of your data and email address as well as their use for sending
          the newsletter at any time, e.g. through the "unsubscribe" link in the newsletter. The data processed before
          we receive your request may still be legally processed. The data provided when registering for the newsletter
          will be used to distribute the newsletter until you cancel your subscription when said data will be deleted.
          Data we have stored for other purposes (e.g. email addresses for the members area) remain unaffected.
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
          email to this effect to dataprotection@iohk.io. They can also remove themselves from the mailing list using
          the unsubscribe link in the newsletter.
        </Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Cookie Compliance Solution</Subtitle>
        <Paragraph>IOG currently uses a cookie solution provided by Optanon (https//www.optanon.com).</Paragraph>
        <br />
        <br />
        <Subtitle semiBold>Optanon</Subtitle>
        <Paragraph>
          By selecting the 'Privacy Settings' button available on each Product page, you can learn more about the
          cookies we use to enhance your Product experience, and you can choose not to allow some types of cookies to be
          set. However, please note that opting out of certain cookies may impact your Product experience, and certain
          services provided on our Product may no longer be available.
        </Paragraph>
        <br />
        <br />
        <Title>11. Links To Other Products</Title>
        <Paragraph>
          This Product may contain links to other products that are not operated by IOG. If you click on a third party
          link, you will be directed to that third party's site. You're advised to review the privacy policy of each
          non-IOG site you decide to visit.
        </Paragraph>
        <br />
        <br />
        <Paragraph>
          IOG has no control over and assumes no responsibility for the content, privacy policies or practices of any
          third party product or service.
        </Paragraph>
        <br />
        <br />
        <Title>12. Changes To This Privacy Policy</Title>
        <Paragraph>
          TIOG may update this Privacy Policy from time to time. Such changes will be posted on this page. The effective
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
          When you contact us by e-mail or through a contact form, we will store the data you provide (your email
          address, possibly your name and telephone number) so we can answer your questions. Insofar as we use our
          contact form to request entries that are not required for contacting you, we have always marked these as
          optional. This information serves to substantiate your inquiry and improve the handling of your request. Your
          message may be linked to various actions taken by you on the IOG website. Information collected will be solely
          used to provide you with support relating to your inquiry and better understand your feedback. A statement of
          this information is expressly provided on a voluntary basis and with your consent, art. 6 par. 1a GDPR. As far
          as this concerns information about communication channels (such as your e-mail address or telephone number),
          you also agree that we may also, where appropriate, contact you via this communication channel to answer your
          request. You may of course revoke this consent for the future at any time.
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
