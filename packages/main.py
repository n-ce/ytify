def main(args):
    name = args.get('name', "World")
    name = name if name else "World"
    message = "Hello, " + name + "!";
    print(message)
    return {
        "body": {"message": message}
    }