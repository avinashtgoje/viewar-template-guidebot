import React from 'react';
import classNames from 'classnames';
import Button from '../button';
import IconButton from '../icon-button';
import Background from '../background';
import styles from './styles.css';
import { translate } from '../../services/translations';
import globalStyles from '../../../css/global.css';

export default ({
  promptVisible,
  promptText,
  promptButton,
  closePrompt,
  onPromptConfirm,
  className,
}) => (
  <div
    className={classNames(
      styles.container,
      !promptVisible && styles.isHidden,
      className
    )}
  >
    <Background />
    <div className={classNames(styles.text, globalStyles.CustomFont3)}>
      {translate(promptText, false)}
    </div>
    {promptButton && (
      <Button
        className={classNames(styles.button)}
        onClick={() => onPromptConfirm()}
        label={translate(promptButton, false)}
      />
    )}
    <IconButton
      size="small"
      icon="close"
      onClick={() => closePrompt()}
      className={styles.closeButton}
    />
  </div>
);
