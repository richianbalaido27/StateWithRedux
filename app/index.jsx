import { configureStore, createSlice, nanoid } from "@reduxjs/toolkit";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Appbar,
  Avatar,
  Banner,
  Button,
  Card,
  Divider,
  MD3DarkTheme,
  MD3LightTheme,
  Provider as PaperProvider,
  Switch,
  Text,
  TextInput,
} from "react-native-paper";
import { Provider, useDispatch, useSelector } from "react-redux";

// ---- UI Slice ----
const themeSlice = createSlice({
  name: "theme",
  initialState: { dark: false, bannerVisible: false },
  reducers: {
    toggleTheme(state) {
      state.dark = !state.dark;
    },
    triggerBanner(state) {
      state.bannerVisible = true;
    },
    hideBanner(state) {
      state.bannerVisible = false;
    },
  },
});

// ---- Todos Slice ----
const taskSlice = createSlice({
  name: "tasks",
  initialState: { list: [] },
  reducers: {
    createTask: {
      reducer(state, action) {
        state.list.unshift(action.payload);
      },
      prepare(text) {
        return {
          payload: {
            id: nanoid(),
            title: text,
            done: false,
            createdAt: Date.now(),
          },
        };
      },
    },
    toggleTaskStatus(state, action) {
      const task = state.list.find((t) => t.id === action.payload);
      if (task) task.done = !task.done;
    },
    deleteTask(state, action) {
      state.list = state.list.filter((t) => t.id !== action.payload);
    },
    wipeTasks(state) {
      state.list = [];
    },
  },
});

const { toggleTheme, triggerBanner, hideBanner } = themeSlice.actions;
const { createTask, toggleTaskStatus, deleteTask, wipeTasks } =
  taskSlice.actions;

// ---- Store ----
const store = configureStore({
  reducer: {
    theme: themeSlice.reducer,
    tasks: taskSlice.reducer,
  },
});

// ---- App Root ----
export default function App() {
  return (
    <Provider store={store}>
      <RootApp />
    </Provider>
  );
}

function RootApp() {
  const dark = useSelector((s) => s.theme.dark);
  const theme = useMemo(() => (dark ? MD3DarkTheme : MD3LightTheme), [dark]);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={{ flex: 1 }}>
        <MainLayout />
      </SafeAreaView>
    </PaperProvider>
  );
}

function MainLayout() {
  const dispatch = useDispatch();
  const { width } = useWindowDimensions();
  const bannerVisible = useSelector((s) => s.theme.bannerVisible);
  const isWide = width >= 768;

  return (
    <View style={[styles.appContainer, isWide && styles.appContainerWide]}>
      <Appbar.Header>
        <Appbar.Content
          title="Todo Manager"
          subtitle={`Running on ${Device.osName || "Unknown"}`}
        />
        <ThemeSwitch />
      </Appbar.Header>

      {bannerVisible && (
        <Banner
          visible
          actions={[{ label: "OK", onPress: () => dispatch(hideBanner()) }]}
          icon={({ size }) => (
            <Avatar.Icon size={size} icon="information-outline" />
          )}
        >
          TODOS LIST ADDED!
        </Banner>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[isWide && styles.scrollWide, { paddingBottom: 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.column, isWide && styles.columnWide]}>
          <TodoSection />
        </View>
      </ScrollView>

      <Appbar style={styles.footer}>
        <Appbar.Action icon="github" onPress={() => {}} />
        <Appbar.Content
          title="Footer"
          subtitle={Platform.select({
            ios: "iOS",
            android: "Android",
            default: "Web",
          })}
        />
      </Appbar>
    </View>
  );
}

function ThemeSwitch() {
  const dispatch = useDispatch();
  const dark = useSelector((s) => s.theme.dark);

  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingRight: 12 }}>
      <Text style={{ marginRight: 8 }}>{dark ? "Dark" : "Light"}</Text>
      <Switch value={dark} onValueChange={() => dispatch(toggleTheme())} />
    </View>
  );
}

function TodoSection() {
  const dispatch = useDispatch();
  const tasks = useSelector((s) => s.tasks.list);
  const [input, setInput] = useState("");
  const { width } = useWindowDimensions();
  const cols = width >= 900 ? 2 : 1;

  const handleAdd = () => {
    if (!input.trim()) return;
    dispatch(createTask(input.trim()));
    dispatch(triggerBanner());
    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const pending = tasks.filter((t) => !t.done);
  const completed = tasks.filter((t) => t.done);

  const renderItem = (item, icon, actionLabel, actionHandler) => (
    <Card style={{ flex: 1, marginRight: cols > 1 ? 8 : 0 }}>
      <Card.Title
        title={item.title}
        subtitle={new Date(item.createdAt).toLocaleString()}
        left={(props) => <Avatar.Icon {...props} icon={icon} />}
      />
      <Card.Actions>
        <Button onPress={() => actionHandler(item.id)}>{actionLabel}</Button>
        <Button onPress={() => dispatch(deleteTask(item.id))}>Remove</Button>
      </Card.Actions>
    </Card>
  );

  return (
    <Card style={styles.card}>
      <Card.Title
        title="Todos"
        subtitle="Pending and Completed"
        left={(props) => <Avatar.Icon {...props} icon="clipboard-list" />}
      />
      <Card.Content>
        {/* Input Row */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            style={{ flex: 1 }}
            label="New task"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
          />
          <Button mode="contained" onPress={handleAdd}>
            Add
          </Button>
        </View>

        <Divider style={{ marginVertical: 12 }} />

        {/* Pending List */}
        <FlatList
          data={pending}
          key={cols}
          numColumns={cols}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) =>
            renderItem(item, "circle-outline", "Done", (id) =>
              dispatch(toggleTaskStatus(id))
            )
          }
          ListEmptyComponent={<Text>No pending tasks.</Text>}
        />

        {/* Completed List */}
        {completed.length > 0 && (
          <>
            <Divider style={{ marginVertical: 12 }} />
            <Text style={{ marginBottom: 8, fontWeight: "bold" }}>Completed</Text>
            <FlatList
              data={completed}
              key={cols}
              numColumns={cols}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) =>
                renderItem(item, "check-circle", "Undo", (id) =>
                  dispatch(toggleTaskStatus(id))
                )
              }
            />
          </>
        )}

        {tasks.length > 0 && (
          <Button style={{ marginTop: 8 }} onPress={() => dispatch(wipeTasks())}>
            Clear All
          </Button>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  appContainer: { flex: 1, backgroundColor: "transparent" },
  appContainerWide: { paddingHorizontal: 12 },
  scroll: { flex: 1, padding: 12 },
  scrollWide: { flexDirection: "row", gap: 12 },
  column: { flex: 1 },
  columnWide: { flex: 1 },
  card: { marginBottom: 12, borderRadius: 16, overflow: "hidden" },
  footer: { justifyContent: "center" },
});
