import React from 'react';
import cx from 'classnames';
import styles from './styles.css';
import globalStyles from '../../../css/global.css';
import IconButton from '../../components/icon-button';
import Logo from '../../components/logo';
import Toolbar from '../../components/toolbar';
import Background from '../../components/background';
import VersionInfo from '../../components/version-info';
import { translate } from '../../services/translations';

export default ({ openUrl, infoText, goTo, loading, goToInitTracker }) => (
  <div className={styles.container}>
    <Background />
    <Toolbar>
      <IconButton
        size="small"
        icon="back"
        className={styles.buttonSmall}
        onClick={() => goTo('/')}
      />
    </Toolbar>

    <div className={cx(styles.info)}>
      <div>{translate(infoText)}</div>
      <br />
      <h1 className={cx(globalStyles.CustomFont3)}>
        {translate('InfoDeveloper')}
      </h1>
      <div className={cx(styles.logo)} />
      <p className={cx(globalStyles.CustomFont3)}>
        Augmented Reality Solutions
        <br />
        <a
          className={cx(styles.link, globalStyles.CustomFont3)}
          onClick={() => openUrl('http://www.viewar.com')}
        >
          www.viewar.com
        </a>
      </p>
    </div>
    <VersionInfo className={styles.versionInfo} />
  </div>
);
