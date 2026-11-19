import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/** iOS fires "will" events (in sync with the animation); Android only has "did". */
const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

export const useKeyboardVisible = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(SHOW, () => setVisible(true));
    const hide = Keyboard.addListener(HIDE, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
};
