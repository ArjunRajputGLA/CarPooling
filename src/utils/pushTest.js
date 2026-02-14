import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export async function testPushToken(){

  if (!Device.isDevice) {
    alert("Use physical phone");
    return;
  }

  const { status } = await Notifications.requestPermissionsAsync();

  if (status !== 'granted'){
    alert("Permission denied");
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig.extra.eas.projectId
  });

  console.log("TOKEN:", token.data);
  alert(token.data);

  return token.data;
}